import { Product } from '@/lib/vector-store';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <div className="bg-white border rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="w-full h-24 bg-slate-100 rounded-lg mb-3 flex items-center justify-center text-slate-300 font-bold text-xs uppercase">
        In Stock
      </div>
      <h4 className="font-semibold text-slate-800 text-sm line-clamp-1">{product.name}</h4>
      <p className="text-[#0c831f] font-bold text-sm mt-1">₹{product.price}</p>
      <p className="text-slate-500 text-[10px] mt-1 line-clamp-2 leading-relaxed">
        {product.desc}
      </p>
      <button className="w-full mt-3 py-2 bg-[#0c831f] text-white text-xs font-bold rounded-lg hover:bg-[#0a6d1a] transition-colors">
        ADD TO CART
      </button>
    </div>
  );
}
