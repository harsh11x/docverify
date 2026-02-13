"use client"

import { useEffect, useState } from "react"
import { Check, X, Ban, Loader2 } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { BanDialog } from "@/components/admin/ban-dialog"

interface Organization {
  orgId: string
  name: string
  walletAddress: string
  status: 'pending' | 'verified' | 'rejected' | 'banned'
  registrationTimestamp: number
  banExpiresAt?: string
}

export default function AdminDashboard() {
  const [pendingOrgs, setPendingOrgs] = useState<Organization[]>([])
  const [activeOrgs, setActiveOrgs] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [banDialogOpen, setBanDialogOpen] = useState(false)
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const { toast } = useToast()

  const fetchOrganizations = async () => {
    try {
      setLoading(true)
      // Fetch pending organizations
      const pendingRes = await fetch("/api/organizations?status=pending")
      const pendingData = await pendingRes.json()

      // Fetch active/all organizations
      const allRes = await fetch("/api/organizations")
      const allData = await allRes.json()

      if (pendingData.success) {
        setPendingOrgs(pendingData.data.organizations.filter((org: Organization) => org.status === 'pending'))
      }

      if (allData.success) {
        setActiveOrgs(allData.data.organizations.filter((org: Organization) => org.status !== 'pending'))
      }
    } catch (error) {
      console.error("Failed to fetch organizations:", error)
      toast({
        title: "Error",
        description: "Failed to load organizations",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrganizations()
  }, [])

  const handleApprove = async (orgId: string) => {
    try {
      const response = await fetch(`/api/organizations/${orgId}/approve`, {
        method: 'PUT'
      })

      if (response.ok) {
        toast({ title: "Organization Approved" })
        fetchOrganizations()
      } else {
        throw new Error("Failed to approve")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve organization",
        variant: "destructive"
      })
    }
  }

  const handleReject = async (orgId: string) => {
    try {
      const response = await fetch(`/api/organizations/${orgId}/reject`, {
        method: 'PUT'
      })

      if (response.ok) {
        toast({ title: "Organization Rejected" })
        fetchOrganizations()
      } else {
        throw new Error("Failed to reject")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject organization",
        variant: "destructive"
      })
    }
  }

  const openBanDialog = (org: Organization) => {
    setSelectedOrg(org)
    setBanDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage organization registrations and access.</p>
      </div>

      {/* Pending Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Registrations</CardTitle>
          <CardDescription>
            Organizations waiting for approval.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Wallet Address</TableHead>
                <TableHead>Registered At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingOrgs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No pending registrations
                  </TableCell>
                </TableRow>
              ) : (
                pendingOrgs.map((org) => (
                  <TableRow key={org.orgId}>
                    <TableCell className="font-medium">{org.name}</TableCell>
                    <TableCell className="font-mono text-xs">{org.walletAddress}</TableCell>
                    <TableCell>{format(new Date(org.registrationTimestamp || Date.now()), 'PPP')}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => handleReject(org.orgId)}>
                        <X className="mr-2 h-4 w-4" /> Reject
                      </Button>
                      <Button size="sm" onClick={() => handleApprove(org.orgId)}>
                        <Check className="mr-2 h-4 w-4" /> Approve
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Active Organizations */}
      <Card>
        <CardHeader>
          <CardTitle>Registered Organizations</CardTitle>
          <CardDescription>
            View and manage verified organizations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ban Expiry</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeOrgs.map((org) => (
                <TableRow key={org.orgId}>
                  <TableCell className="font-medium">{org.name}</TableCell>
                  <TableCell>
                    <Badge variant={
                      org.status === 'verified' ? 'default' :
                        org.status === 'banned' ? 'destructive' : 'secondary'
                    }>
                      {org.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {org.banExpiresAt ? format(new Date(org.banExpiresAt), 'PPP p') : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {org.status !== 'banned' && (
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => openBanDialog(org)}>
                        <Ban className="mr-2 h-4 w-4" /> Ban
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedOrg && (
        <BanDialog
          open={banDialogOpen}
          onOpenChange={setBanDialogOpen}
          organizationId={selectedOrg.orgId}
          organizationName={selectedOrg.name}
          onBanComplete={() => {
            fetchOrganizations()
            setSelectedOrg(null)
          }}
        />
      )}
    </div>
  )
}
