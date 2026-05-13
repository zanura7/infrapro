import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { Filter, Package, Plus, Sparkles } from 'lucide-react';

type Product = {
    id: number;
    slug: string;
    name: string;
    category: string | null;
    price: string | null;
    currency: string;
    usp: string[] | null;
    target_audience: string | null;
    current_version: number;
    assets_count: number;
    content_jobs_count: number;
    updated_at: string;
};

type Props = {
    products: Product[];
    stats: { total: number; asset_count: number; content_count: number; voice_count: number };
};

export default function ProductsIndex({ products, stats }: Props) {
    return (
        <AuthenticatedLayout header="Product Hub" activeKey="products">
            <Head title="Product Hub" />

            <div className="px-8 py-8">
                <div className="flex items-end justify-between mb-6">
                    <div>
                        <div className="text-[11px] tracking-[0.2em] text-brand-600 font-semibold mb-2">
                            MODULE 01 · FOUNDATION
                        </div>
                        <h1 className="font-display text-4xl font-semibold">Product Hub</h1>
                        <p className="text-ink-900/60 mt-1 text-sm">
                            Single source of truth for every product in the workspace.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button className="px-3 py-2 text-xs font-medium rounded-md bg-white border border-ink-200 hover:bg-ink-100 inline-flex items-center gap-2">
                            <Filter className="w-3.5 h-3.5" /> Filter
                        </button>
                        <Link
                            href={route('products.create')}
                            className="px-3 py-2 text-xs font-medium rounded-md bg-ink-900 text-white hover:bg-ink-950 inline-flex items-center gap-2"
                        >
                            <Plus className="w-3.5 h-3.5" /> Add Product
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-3 mb-8">
                    <StatCard label="TOTAL PRODUCTS" value={stats.total} />
                    <StatCard label="ASSETS" value={`${stats.asset_count} files`} />
                    <StatCard label="CONTENT JOBS" value={stats.content_count} />
                    <StatCard label="BRAND VOICES" value={stats.voice_count} />
                </div>

                {products.length === 0 ? (
                    <EmptyState />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {products.map((p) => (
                            <ProductCard key={p.id} product={p} />
                        ))}
                        <Link
                            href={route('products.create')}
                            className="bg-white border-2 border-dashed border-ink-200 rounded-xl p-6 grid place-items-center text-ink-900/40 hover:border-brand-500 hover:text-brand-500 transition min-h-[180px]"
                        >
                            <div className="text-center">
                                <Plus className="w-6 h-6 mx-auto mb-2" />
                                <div className="text-sm">Add product</div>
                            </div>
                        </Link>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
    return (
        <div className="bg-white border border-ink-200 rounded-lg p-4">
            <div className="text-[10px] tracking-widest text-ink-900/50">{label}</div>
            <div className="font-display text-2xl mt-1">{value}</div>
        </div>
    );
}

function ProductCard({ product }: { product: Product }) {
    return (
        <Link
            href={route('products.show', product.slug)}
            className="bg-white rounded-xl border border-ink-200 p-5 hover:shadow-soft hover:border-brand-500 transition block"
        >
            <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-lg bg-brand-50 grid place-items-center text-brand-600 shrink-0">
                    <Package className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{product.name}</div>
                    <div className="text-[11px] text-ink-900/50 mt-0.5">
                        {product.category || 'Uncategorised'}
                        {product.price && ` · ${product.currency} ${product.price}`}
                    </div>
                </div>
                <span className="text-[10px] font-mono text-ink-900/40 shrink-0">v{product.current_version}</span>
            </div>

            {product.usp && product.usp.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                    {product.usp.slice(0, 3).map((u, i) => (
                        <span
                            key={i}
                            className="px-2 py-0.5 text-[11px] rounded-full bg-brand-50 text-brand-700 ring-1 ring-brand-100"
                        >
                            {u}
                        </span>
                    ))}
                    {product.usp.length > 3 && (
                        <span className="text-[11px] text-ink-900/50">+{product.usp.length - 3}</span>
                    )}
                </div>
            )}

            <div className="mt-4 pt-3 border-t border-ink-100 flex items-center justify-between text-[11px] text-ink-900/50">
                <span>{product.assets_count} assets · {product.content_jobs_count} contents</span>
                <span className="text-brand-600 inline-flex items-center gap-1">
                    Open <Sparkles className="w-3 h-3" />
                </span>
            </div>
        </Link>
    );
}

function EmptyState() {
    return (
        <div className="bg-white border border-ink-200 rounded-2xl p-16 text-center">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-ink-100 grid place-items-center text-ink-900/40 mb-5">
                <Package className="w-10 h-10" />
            </div>
            <h2 className="font-display text-2xl font-semibold">No products yet.</h2>
            <p className="text-ink-900/60 mt-2 max-w-md mx-auto text-sm">
                Add your first product so the AI knows what to write about.
            </p>
            <Link
                href={route('products.create')}
                className="inline-flex mt-6 px-5 py-2.5 text-sm font-medium rounded-md bg-ink-900 text-white hover:bg-ink-950 items-center gap-2"
            >
                <Plus className="w-4 h-4" /> Add first product
            </Link>
        </div>
    );
}
