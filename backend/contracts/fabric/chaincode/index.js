/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const CertificateChaincode = require('./certificateChaincode');

module.exports.CertificateChaincode = CertificateChaincode;
module.exports.contracts = [CertificateChaincode];
