
"use client";
import React from 'react';
import Image from 'next/image';

interface ImageComparisonProps {
  originalImage: string | null; // data URI
  transformedImage: string | null; // data URI
  targetWidth: number;
  targetHeight: number;
}

export const ImageComparison: React.FC<ImageComparisonProps> = ({ originalImage, transformedImage, targetWidth, targetHeight }) => {
  const Caption: React.FC<{ text: string }> = ({ text }) => (
    <div className="absolute top-2 left-2 bg-black/60 text-white text-xs font-medium px-2 py-1 rounded-md z-10">
      {text}
    </div>
  );

  return (
    <div className="grid md:grid-cols-2 gap-2 h-full"> {/* Reduced gap from 4 to 2 */}
      <div className="shadow-md rounded-lg flex flex-col overflow-hidden h-full bg-muted/20">
        <div className="flex-grow flex items-center justify-center p-2 relative h-full">
          {originalImage ? (
            <div className="relative w-full h-full">
              <Caption text="Before" />
              <Image
                src={originalImage}
                alt="Original Street View"
                layout="fill"
                objectFit="contain"
                className="rounded-md"
                data-ai-hint="street building"
              />
            </div>
          ) : (
            <div className="w-full h-full bg-muted rounded-md flex items-center justify-center text-muted-foreground" style={{ aspectRatio: `${targetWidth}/${targetHeight}` }}>
              Original image will appear here.
            </div>
          )}
        </div>
      </div>
      <div className="shadow-md rounded-lg flex flex-col overflow-hidden h-full bg-muted/20">
        <div className="flex-grow flex items-center justify-center p-2 relative h-full">
          {transformedImage ? (
             <div className="relative w-full h-full">
              <Caption text="After Transformation" />
              <Image
                src={transformedImage}
                alt="Transformed Street View"
                layout="fill"
                objectFit="contain"
                className="rounded-md"
                data-ai-hint="modern building"
              />
            </div>
          ) : (
            <div className="w-full h-full bg-muted rounded-md flex items-center justify-center text-muted-foreground" style={{ aspectRatio: `${targetWidth}/${targetHeight}` }}>
              Transformed image will appear here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
