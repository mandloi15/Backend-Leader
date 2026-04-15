const mongoose = require("mongoose")
const transactionModel = require("../models/transaction.model")
const ledgerModel = require("../models/ledger.model")
const accountModel = require("../models/account.model")
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

async function createTransaction(req,res) {

    /**
     * 1. Validate request
     */

    const  {fromAccount, toAccount, amount, idempotencyKey} = req.body

    if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({
            message: "fromAccount, toAccount, amount and idempotencyKey are required"
        })
    }

    const fromUserAccount = await accountModel.findOne({
        _id: fromAccount,
    })

    const toUserAccount = await accountModel.findOne({
        _id: toAccount,
    })

    if (!fromUserAccount || !toUserAccount) {
        return res.status(404).json({
            message: "From account or To account not found"
        })
    }

    /**
     * 2. Validate idempotency key
     */

    const isTransactionAlreadyExists = await transactionModel.findOne({
        idempotencyKey: idempotencyKey
    })

    if (isTransactionAlreadyExists){
        if (isTransactionAlreadyExists.status === "COMPLETED") {
            return res.status(200).json({
                message: "Transaction already processed",
                transactionId: isTransactionAlreadyExists
            })
        }

        if (isTransactionAlreadyExists.status === "PENDING") {
            return res.status(200).json({
                message: "Transaction is already in progress",
            })
        }

        if (isTransactionAlreadyExists.status === "FAILED") {
            return res.status(200).json({
                message: "Previous transaction attempt failed, please try again",
            })
        }

        if (isTransactionAlreadyExists.status === "REVERSED") {
            return res.status(200).json({
                message: "Previous transaction was reversed, please try again",
            })
        }
    }

    /**
     * 3. Check account status
     */

    if (fromUserAccount.status !== "ACTIVE" || toUserAccount.status !== "ACTIVE") {
        return res.status(400).json({
            message: "Both from and to accounts must be active to process the transaction"
        })
    }
}

async function createInitialFundsTransaction(req,res) {
    const {toAccount, amount, idempotencyKey} = req.body

    if (!toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({
            message: "toAccount, amount and idempotencyKey are required"
        })
    }

    const toUserAccount = await accountModel.findOne({
        _id: toAccount,
    })

    if (!toUserAccount) {
        return res.status(404).json({
            message: "To account not found"
        })
    }

    const fromUserAccount = await accountModel.findOne({
        user:req.user._id
    })

    if (!fromUserAccount) {
        return res.status(404).json({
            message: "System account not found for the user"
        })
    }


    const session = await mongoose.startSession()
    session.startTransaction()

    const transaction = new transactionModel({
        fromAccount: fromUserAccount._id,
        toAccount,
        amount,
        idempotencyKey,
        status: "PENDING"    
    })

    const debitLedgerEntry = await ledgerModel.create([{
        account: fromUserAccount._id,
        amount: amount,
        transaction: transaction._id,
        type: "DEBIT"
    }], { session })

    const creditLedgerEntry = await ledgerModel.create([{
        account: toAccount,
        amount: amount,
        transaction: transaction._id,
        type: "CREDIT"
    }], { session })

    transaction.status = "COMPLETED"
    await transaction.save({ session })

    await session.commitTransaction()
    session.endSession()

    return res.status(201).json({
        message: "Initial funds transaction created successfully",
        transactionId: transaction._id
    })
}

module.exports = {
    createTransaction,
    createInitialFundsTransaction
}