import axios from "axios";

const FASTAPI_URL = process.env.FASTAPI_URL;

export const handleTranscription = async (audioUrl) => {
  try {
    const response = await axios.post(`${FASTAPI_URL}/transcribe/audio`, {
      audioUrl,
    });

    return response.data;
  } catch (error) {
    console.error("❌ Error calling FastAPI:", error.message);
    throw new Error("FastAPI request failed");
  }
};
