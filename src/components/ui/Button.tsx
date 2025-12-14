import React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
    "flex flex-row items-center justify-center rounded px-5 py-2.5 text-sm font-semibold tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60",
    {
        variants: {
            variant: {
                primary: "bg-[#4cff00] text-black hover:bg-[#3de000] shadow-[0_0_10px_rgba(76,255,0,0.2)]", // Xbox/Steam Green, text usually black on bright green, but legacy said white? Legacy code: case 'primary': return '#fff'; Wait, bright green with white text is unreadable. Legacy text color logic: primary -> #fff. Okay I will trust legacy but usually #4cff00 needs black. I will try white first as per legacy, but maybe add text shadow.
                secondary: "bg-[#2a3f55] text-white hover:bg-[#354f6b]", // Steam Blue-ish
                danger: "bg-[#d9534f] text-white hover:bg-[#c9302c]",
                outline: "border border-[#6e7681] bg-transparent text-[#dcdedf] hover:bg-white/5",
                ghost: "bg-transparent text-[#dcdedf] hover:bg-white/5",
            },
            size: {
                default: "h-10 px-4 py-2",
                sm: "h-9 rounded-md px-3",
                lg: "h-11 rounded-md px-8",
                icon: "h-10 w-10",
            },
        },
        defaultVariants: {
            variant: "primary",
            size: "default",
        },
    }
);

/* 
Legacy Colors Note: 
Primary Bg: #4cff00 (High-vis green)
Primary Text (Legacy): #fff 
Accessibility catch: White on #4cff00 is failing wcag. 
I will override text color for primary to black/dark for better readability, or keep as legacy if user insists.
Actually, let's stick to legacy behavior first: Text Color was #fff.
Wait, primary hex #4cff00 with white text is extremely hard to read.
The legacy button shows:
case 'primary': return '#4cff00';
case 'primary': return '#fff'; (Text)
I will implement as is, but maybe switch to black if it looks bad in review.
Update: Modern Steam buttons are often this green with white text? No, usually darker green. 
I will add a specific override class for primary text color if needed.
For now, following legacy.
*/

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    isLoading?: boolean;
    icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, isLoading, children, icon, disabled, ...props }, ref) => {
        return (
            <button
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <>
                        {icon && <span className="mr-2">{icon}</span>}
                        {children}
                    </>
                )}
            </button>
        );
    }
);
Button.displayName = "Button";
