export default function Search() {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold text-chanox-accent mb-4">SEARCH</h1>

            {/* Search Input */}
            <div className="mb-6">
                <input
                    type="text"
                    placeholder="Search for games..."
                    className="w-full max-w-xl px-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-chanox-accent text-lg"
                />
            </div>

            {/* Filters */}
            <div className="flex gap-4 mb-6">
                <select className="px-4 py-2 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-chanox-accent">
                    <option>All Categories</option>
                    <option>Action</option>
                    <option>Adventure</option>
                    <option>RPG</option>
                </select>
                <select className="px-4 py-2 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-chanox-accent">
                    <option>Sort by: Recent</option>
                    <option>Sort by: Popular</option>
                    <option>Sort by: Name</option>
                </select>
            </div>

            {/* Search Results Placeholder */}
            <p className="text-muted-foreground mb-6">
                Search results will be displayed here.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div
                        key={i}
                        className="p-4 bg-card rounded-lg border border-border hover:border-chanox-accent transition-colors cursor-pointer"
                    >
                        <div className="aspect-video bg-muted rounded mb-3 flex items-center justify-center">
                            <span className="text-sm text-muted-foreground">Result {i}</span>
                        </div>
                        <h3 className="font-medium">Search Result {i}</h3>
                        <p className="text-sm text-muted-foreground">Category • Downloads</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
