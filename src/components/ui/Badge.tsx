
import { cn } from '@/lib/utils';

interface BadgeProps {
    label: string;
    value?: string;
    className?: string;
    labelClassName?: string;
    valueClassName?: string;
}

export const Badge = ({ label, value, className, labelClassName, valueClassName }: BadgeProps) => {
    return (
        <div className={cn("mb-1.5 flex flex-col", className)}>
            <span className={cn("text-[#acb2b8] text-[10px] font-bold mb-0.5 uppercase tracking-wider", labelClassName)}>
                {label}
            </span>
            {value && (
                <span className={cn("text-[#dcdedf] text-[13px] font-medium leading-none", valueClassName)}>
                    {value}
                </span>
            )}
        </div>
    );
};
