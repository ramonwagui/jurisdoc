import { ai } from "../client";

export async function generateImage(
  prompt: string,
): Promise<{ b64_json: string; mimeType: string }> {
  const response = await ai.images.generate({
    model: "dall-e-3",
    prompt: prompt,
    n: 1,
    size: "1024x1024",
    response_format: "b64_json",
  });

  const b64_json = response.data?.[0]?.b64_json;

  if (!b64_json) {
    throw new Error("No image data in response");
  }

  return {
    b64_json: b64_json,
    mimeType: "image/png",
  };
}
