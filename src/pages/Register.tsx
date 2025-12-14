export default function Register() {
    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-7rem)]">
            <div className="w-full max-w-md p-8 bg-card rounded-lg border border-border">
                <h1 className="text-2xl font-bold text-center mb-6">Create Account</h1>

                <form className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">Username</label>
                        <input
                            type="text"
                            className="w-full px-4 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-chanox-accent"
                            placeholder="Choose a username"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Email</label>
                        <input
                            type="email"
                            className="w-full px-4 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-chanox-accent"
                            placeholder="Enter your email"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Password</label>
                        <input
                            type="password"
                            className="w-full px-4 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-chanox-accent"
                            placeholder="Create a password"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Confirm Password</label>
                        <input
                            type="password"
                            className="w-full px-4 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-chanox-accent"
                            placeholder="Confirm your password"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full py-2 bg-chanox-accent text-chanox-surface font-bold rounded-md hover:bg-chanox-accent/90 transition-colors"
                    >
                        Create Account
                    </button>
                </form>
            </div>
        </div>
    );
}
