import { Product } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ShoppingCart } from 'lucide-react';
import { useCartStore } from '../../store/cart.store';
import { Link } from 'react-router-dom';

export function ProductCard({ product }: { product: Product }) {
  const addItem = useCartStore((state) => state.addItem);

  const isBird = product.type === 'BIRD';
  const isAvailable = product.saleStatus === 'AVAILABLE';

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      quantity: 1,
      thumbnail: product.thumbnail,
    });
  };

  return (
    <Link to={`/store/${product.id}`} className="group bg-white rounded-3xl border border-stone-200 overflow-hidden hover:border-brand-500/50 hover:shadow-xl hover:shadow-brand-500/5 transition-all flex flex-col h-full">
      <div className="relative aspect-square overflow-hidden bg-stone-100">
        {product.thumbnail ? (
          <img
            src={product.thumbnail}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-300">
            No image
          </div>
        )}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <Badge variant={isBird ? 'default' : 'outline'}>
            {isBird ? 'Ave' : 'Artículo'}
          </Badge>
          {!isAvailable && (
            <Badge variant={product.saleStatus === 'SOLD' ? 'danger' : 'warning'}>
              {product.saleStatus === 'SOLD' ? 'Vendido' : 'Reservado'}
            </Badge>
          )}
        </div>
      </div>

      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-lg font-bold text-stone-800 line-clamp-1 mb-1">
          {product.name}
        </h3>
        <p className="text-xs text-stone-400 font-medium mb-4">
          {isBird ? `${product.age} / ${product.purpose}` : `Stock: ${product.stock}`}
        </p>

        <div className="mt-auto flex items-center justify-between gap-4">
          <span className="text-xl font-black text-brand-500">
            ${Number(product.price).toLocaleString()}
          </span>
          {isAvailable && (
            <Button
              size="icon"
              className="rounded-full w-10 h-10 shadow-lg shadow-brand-500/20"
              onClick={handleAddToCart}
            >
              <ShoppingCart size={18} />
            </Button>
          )}
        </div>
      </div>
    </Link>
  );
}
