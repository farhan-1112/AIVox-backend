import mongoose from 'mongoose';

const transcriptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    audioUrl: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const Transcript = mongoose.model('Transcript', transcriptSchema);

export default Transcript;
