/**
 * Extrae fotogramas de un archivo de video en puntos específicos.
 * @param file Archivo de video (File)
 * @param count Número de fotogramas a extraer
 * @returns Promesa con un array de Blobs (imágenes JPEG)
 */
export const extractFramesFromVideo = async (file: File, count: number = 3): Promise<{ blob: Blob, url: string }[]> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const frames: { blob: Blob, url: string }[] = [];
    
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = URL.createObjectURL(file);

    video.onloadedmetadata = async () => {
      const duration = video.duration;
      const interval = duration / (count + 1);
      
      try {
        for (let i = 1; i <= count; i++) {
          const time = interval * i;
          video.currentTime = time;
          
          await new Promise((res) => {
            video.onseeked = () => res(true);
          });

          // Ajustar tamaño del canvas al video
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          if (context) {
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.8));
            if (blob) {
              frames.push({
                blob,
                url: URL.createObjectURL(blob)
              });
            }
          }
        }
        resolve(frames);
      } catch (err) {
        reject(err);
      } finally {
        URL.revokeObjectURL(video.src);
      }
    };

    video.onerror = () => {
      reject(new Error('Error al cargar el video para extracción de miniaturas.'));
    };
  });
};
