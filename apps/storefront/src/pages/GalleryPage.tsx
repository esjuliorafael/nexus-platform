import { useEffect, useState } from 'react';
import { mediaApi } from '../api/settings';
import { Media } from '../types';
import { Spinner } from '../components/ui/Spinner';
import { PlayCircle, Image as ImageIcon, LayoutGrid, Camera, Video } from 'lucide-react';

export function GalleryPage() {
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'PHOTO' | 'VIDEO'>('ALL');

  useEffect(() => {
    mediaApi.getAll()
      .then(data => {
        setMedia(Array.isArray(data) ? data : []);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredMedia = Array.isArray(media) ? media.filter(m => filter === 'ALL' || m.type === filter) : [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-black text-stone-800 tracking-tight uppercase italic lora">Galería</h1>
        <p className="text-stone-500 font-medium text-lg">Nuestros mejores ejemplares y momentos del rancho</p>
      </div>

      <div className="flex justify-center gap-2">
        <button 
          onClick={() => setFilter('ALL')}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${filter === 'ALL' ? 'bg-stone-800 text-white shadow-xl' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}
        >
          <LayoutGrid size={18} /> Todos
        </button>
        <button 
          onClick={() => setFilter('PHOTO')}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${filter === 'PHOTO' ? 'bg-stone-800 text-white shadow-xl' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}
        >
          <Camera size={18} /> Fotos
        </button>
        <button 
          onClick={() => setFilter('VIDEO')}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${filter === 'VIDEO' ? 'bg-stone-800 text-white shadow-xl' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}
        >
          <Video size={18} /> Videos
        </button>
      </div>

      {loading ? (
        <div className="h-96 flex items-center justify-center">
          <Spinner className="w-12 h-12" />
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
          {filteredMedia.map((m) => (
            <div key={m.id} className="relative group rounded-3xl overflow-hidden bg-stone-100 border border-stone-100 shadow-sm break-inside-avoid">
              <img src={m.filePath} className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700" alt={m.title} />
              
              {m.type === 'VIDEO' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors pointer-events-none">
                  <PlayCircle className="text-white drop-shadow-2xl" size={48} strokeWidth={1.5} />
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-stone-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-6 flex flex-col justify-end text-white">
                <h4 className="font-bold text-lg">{m.title}</h4>
                <p className="text-xs text-stone-300 line-clamp-2">{m.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
