import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const categories = [
    { name: 'Action', color: 'from-[#ff4b2b] to-[#ff416c]', slug: 'action' },
    { name: 'Adventure', color: 'from-[#11998e] to-[#38ef7d]', slug: 'adventure' },
    { name: 'RPG', color: 'from-[#8e2de2] to-[#4a00e0]', slug: 'rpg' },
    { name: 'Strategy', color: 'from-[#f2994a] to-[#f2c94c]', slug: 'strategy' },
    { name: 'Simulation', color: 'from-[#00c6ff] to-[#0072ff]', slug: 'simulation' },
    { name: 'Casual', color: 'from-[#eb3349] to-[#f45c43]', slug: 'casual' },
];

export default function CategoryBrowse() {
    return (
        <div className="w-full max-w-[1200px] mx-auto px-4 mb-12">
            <h2 className="text-[#dcdedf] text-sm font-bold tracking-wider mb-4 uppercase">Browse by Genre</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {categories.map((cat) => (
                    <Link
                        key={cat.name}
                        to={`/?tag=${cat.slug}`}
                        className={cn(
                            "relative h-24 rounded-sm overflow-hidden group transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:-translate-y-1 bg-gradient-to-br",
                            cat.color
                        )}
                    >
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-white font-bold text-sm tracking-widest uppercase drop-shadow-lg transform transition-transform group-hover:scale-110">
                                {cat.name}
                            </span>
                        </div>
                        {/* Decorative subtle shine */}
                        <div className="absolute -inset-full top-0 block w-1/2 h-full z-10 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-25deg] group-hover:animate-shine" />
                    </Link>
                ))}
            </div>
        </div>
    );
}
