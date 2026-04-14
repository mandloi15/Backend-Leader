const transactionModel = require("../models/transaction.model")
const ledgerModel = require("../models/ledger.model")
const emailService = require("../services/email.service")


/**
 * * - Create a new transaction
 * The 10-Step Transfer Flow:
 * 1. Validate request
 * 2. Validate idempotency key
 * 3. Check accounnt status
 * 4. Derive sender balance from ledger
 * 5. Ccreate transaction (PENDING)
 * 6. Create Debit ledger entry
 * 7. Create Credit ledger entry
 * 8. Mark transaction as COMPLETED
 * 9. Commit MongoDB session 
 * 10. Send response
 */