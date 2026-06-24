import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    product: { type: String, default: 'ayanakoji_x_license' },
    amount: { type: Number, required: true }, // in USD
    currency: { type: String, default: 'USD' },

    status: {
      type: String,
      enum: ['pending', 'receipt_submitted', 'approved', 'rejected', 'paid'],
      default: 'pending',
      index: true,
    },

    method: { type: String, enum: ['paypal', 'receipt', null], default: null },

    // PayPal fields
    paypalOrderId: { type: String },
    paypalCaptureId: { type: String },

    // Manual receipt fields
    receiptFilePath: { type: String }, // stored outside the public web root
    receiptOriginalName: { type: String },
    reviewedBy: { type: String }, // admin email
    reviewedAt: { type: Date },
    rejectionReason: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model('Order', orderSchema);
