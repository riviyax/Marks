import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    // Firebase UID is the source of truth for identity — never trust a client-supplied id.
    firebaseUid: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, index: true },
    displayName: { type: String },
    photoURL: { type: String },
    unlocked: { type: Boolean, default: false },
    unlockedAt: { type: Date },
    unlockedVia: { type: String, enum: ['paypal', 'receipt', null], default: null },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
