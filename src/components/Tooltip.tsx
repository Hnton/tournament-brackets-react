import * as React from 'react';

interface TooltipProps {
    content: string;
    children: React.ReactNode;
    className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({ 
    content, 
    children,
    className = ''
}) => {
    return (
        <div className={`tooltip-wrapper ${className}`} title={content}>
            {children}
        </div>
    );
};