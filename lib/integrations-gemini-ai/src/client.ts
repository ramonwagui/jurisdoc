import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error(
    "OPENAI_API_KEY must be set. Did you forget to provide the OpenAI API key?",
  );
}

export const ai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
