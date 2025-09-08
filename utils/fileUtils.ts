export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const getBase64WithSelection = (
    base64Image: string, 
    mimeType: string, 
    selection: { x: number; y: number }
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = `data:${mimeType};base64,${base64Image}`;
    img.onerror = reject;
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return reject(new Error('Could not get canvas context'));
        }

        // Draw original image
        ctx.drawImage(img, 0, 0);

        // Draw selection circle
        const radius = Math.max(img.naturalWidth * 0.01, 15); // Radius is 1% of image width, or at least 15px
        ctx.beginPath();
        ctx.arc(selection.x, selection.y, radius, 0, 2 * Math.PI, false);
        ctx.fillStyle = '#0d9488'; // teal-600
        ctx.fill();
        ctx.lineWidth = Math.max(img.naturalWidth * 0.005, 5); // Border is 0.5% of width, or at least 5px
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // Get base64 from canvas
        const dataUrl = canvas.toDataURL(mimeType);
        const base64 = dataUrl.split(',')[1];
        resolve(base64);
    };
  });
};
