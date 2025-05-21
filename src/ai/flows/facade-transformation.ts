
'use server';
/**
 * @fileOverview Transforms facades of 'ugly' buildings in a Madrid street view image into more aesthetically pleasing designs.
 *
 * - facadeTransformation - A function that handles the facade transformation process.
 * - FacadeTransformationInput - The input type for the facadeTransformation function.
 * - FacadeTransformationOutput - The return type for the facadeTransformation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const FacadeTransformationInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A Google Street View image of a street in Madrid, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type FacadeTransformationInput = z.infer<typeof FacadeTransformationInputSchema>;

const FacadeTransformationOutputSchema = z.object({
  transformedPhotoDataUri: z
    .string()
    .describe(
      'The transformed image with updated building facades, as a data URI that must include a MIME type and use Base64 encoding.'
    ),
});
export type FacadeTransformationOutput = z.infer<typeof FacadeTransformationOutputSchema>;

export async function facadeTransformation(input: FacadeTransformationInput): Promise<FacadeTransformationOutput> {
  return facadeTransformationFlow(input);
}

const facadeTransformationFlow = ai.defineFlow(
  {
    name: 'facadeTransformationFlow',
    inputSchema: FacadeTransformationInputSchema,
    outputSchema: FacadeTransformationOutputSchema,
  },
  async (input: FacadeTransformationInput) => {
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp', 
      prompt: [
        { media: { url: input.photoDataUri } },
        {
          text: `You are an expert AI architectural visualizer. Your task is to subtly enhance the facades of buildings in the provided Madrid street view image. The output image MUST be a direct modification of the input image, maintaining the EXACT same perspective, camera angle, and overall scene composition.

Your goal is to identify buildings (or parts of buildings, specifically upper residential floors) in the provided image that have facades detracting from the street's overall beauty due to outdated, "ugly", or poorly maintained designs.

For these identified buildings, you will ONLY replace their facade surface materials on the UPPER, RESIDENTIAL FLOORS with high-quality, modern designs that are harmonious with traditional Madrid architecture. This is a VISUAL REFRESH, not a structural rebuild or re-rendering.

Key requirements, to be followed with EXTREME PRECISION:
1.  **PERSPECTIVE & COMPOSITION PRESERVATION (CRITICAL)**: The output image MUST perfectly match the input image's perspective, camera angle, and field of view. The building MUST NOT move, change apparent size, or be viewed from a different angle.
2.  **VOLUME AND FEATURE PRESERVATION (CRITICAL)**: You MUST maintain the original building's EXACT shape and volume. ALL existing architectural features such as windows, **balconies (including their railings, existing enclosures like paneling, or their open state)**, doors, cornices, and other structural or significant decorative elements MUST remain in their EXACT original positions, shapes, and sizes. Do NOT add, remove, or resize ANY of these features.
3.  **BALCONY CONSISTENCY (Building Specific)**:
    *   Carefully examine each building. If a building in the image has *some* of its balconies already enclosed (e.g., with white aluminum, PVC, or similar paneling), you MUST transform *all* balconies on that *SAME BUILDING* to have a similar, consistent, modern enclosure style. The new enclosure style should be clean and visually harmonious with the updated facade.
    *   If a building's balconies are all open (not enclosed), they MUST remain open. Do not add enclosures where none exist.
    *   The underlying structure and railings of the balconies themselves MUST NOT CHANGE, only the potential addition or consistent modification of enclosures if some already exist on that specific building.
4.  **GROUND FLOOR PRESERVATION (CRITICAL)**: The ground floor of ALL buildings, especially if they contain shopfronts, commercial entrances, signage, or distinct architectural treatments, MUST remain completely UNTOUCHED and IDENTICAL to the input image. Your transformations should ONLY apply to the residential floors *ABOVE* the ground level. Do not alter ground floor facades in any way.
5.  **REALISTIC LIGHTING**: The lighting on the transformed facade must be natural, realistic, and perfectly consistent with the lighting conditions (e.g., time of day, shadows, sun direction, intensity) present in the original image. Avoid flat, artificial-looking, or inconsistent lighting.
6.  **CONTEXTUAL HARMONY & MATERIALS (Upper Floors)**: The new facade for the upper, residential floors should blend well with Madrid's architectural style – aim for elegance and modernity that complements tradition. Use realistic textures and materials (e.g., stone, stucco, wood accents, terracotta, warm beige tones, avoiding overly plain or "blanc" surfaces).
7.  **SELECTIVE TRANSFORMATION (Upper Floors)**: Only transform facades on the upper floors of buildings that are genuinely "ugly" or significantly detract from the streetscape. Leave well-maintained, average, or architecturally interesting building facades (or their upper floors) untouched. If no buildings require transformation, return the original image.
8.  **HIGH QUALITY OUTPUT**: The transformed image should be of high visual quality, with realistic textures and seamless integration of the new facade into the original image.

Output the transformed image as a data URI.`,
        },
      ],
      config: {
        responseModalities: ['TEXT', 'IMAGE'], 
      },
    });

    if (!media?.url) {
      throw new Error('Image generation failed or did not return a media URL.');
    }
    return { transformedPhotoDataUri: media.url };
  }
);

