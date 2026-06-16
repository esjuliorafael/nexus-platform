/**
 * Extrae fotogramas de un video (Archivo o URL) en puntos específicos.
 * @param source Archivo de video (File) o URL del video (string)
 * @param count Número de fotogramas a extraer
 * @returns Promesa con un array de Blobs (imágenes JPEG)
 */
export const extractFramesFromVideo = async (source: File | string, count: number = 3): Promise<{ blob: Blob, url: string }[]> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const frames: { blob: Blob, url: string }[] = [];
    
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous'; // Necesario para videos remotos (CORS)

    if (typeof source === 'string') {
      video.src = source;
    } else {
      video.src = URL.createObjectURL(source);
    }

    video.onloadedmetadata = async () => {
      const duration = video.duration;
      // Evitar división por cero o duraciones inválidas
      const validDuration = isFinite(duration) && duration > 0 ? duration : 0;
      const interval = validDuration / (count + 1);
      
      try {
        for (let i = 1; i <= count; i++) {
          const time = interval * i;
          video.currentTime = time;
          
          await new Promise((res) => {
            const onSeeked = () => {
              video.removeEventListener('seeked', onSeeked);
              res(true);
            };
            video.addEventListener('seeked', onSeeked);
          });

          // Ajustar tamaño del canvas al video
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          if (context && canvas.width > 0 && canvas.height > 0) {
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
        if (typeof source !== 'string') {
          URL.revokeObjectURL(video.src);
        }
      }
    };

    video.onerror = () => {
      reject(new Error('Error al cargar el video para extracción de miniaturas.'));
    };
  });
};
