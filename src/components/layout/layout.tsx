import { ReactNode } from 'react';
import { cn } from "../../lib/utils";

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
}

export function PageLayout({ children, className }: PageLayoutProps) {
  return (
    <div className={cn("container mx-auto max-w-7xl", className)}>
      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
}

interface PageHeaderProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ icon, title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        </div>
        {actions}
      </div>
      {description && (
        <p className="text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}

interface FlexLayoutProps {
  children: ReactNode;
  direction?: 'row' | 'col';
  align?: 'start' | 'center' | 'end' | 'between' | 'around';
  gap?: number;
  className?: string;
}

export function FlexLayout({
  children,
  direction = 'row',
  align = 'center',
  gap = 2,
  className
}: FlexLayoutProps) {
  const directionClass = direction === 'col' ? 'flex-col' : '';
  const alignClass = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    between: 'justify-between',
    around: 'justify-around'
  }[align];
  const gapClass = `gap-${gap}`;

  return (
    <div className={cn("flex", directionClass, alignClass, gapClass, className)}>
      {children}
    </div>
  );
}

interface GridLayoutProps {
  children: ReactNode;
  cols?: 1 | 2 | 3 | 4;
  mdCols?: 1 | 2 | 3 | 4;
  lgCols?: 1 | 2 | 3 | 4;
  gap?: number;
  className?: string;
}

export function GridLayout({
  children,
  cols = 1,
  mdCols,
  lgCols,
  gap = 4,
  className
}: GridLayoutProps) {
  const baseClass = `grid-cols-${cols}`;
  const mdClass = mdCols ? `md:grid-cols-${mdCols}` : '';
  const lgClass = lgCols ? `lg:grid-cols-${lgCols}` : '';
  const gapClass = `gap-${gap}`;

  return (
    <div className={cn("grid", baseClass, mdClass, lgClass, gapClass, className)}>
      {children}
    </div>
  );
}

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 text-muted-foreground", className)}>
      <div className="h-16 w-16 mb-4 opacity-20">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm mb-4 max-w-sm text-center">{description}</p>
      {action}
    </div>
  );
}

interface StackProps {
  children: ReactNode;
  space?: 2 | 4 | 6 | 8;
  className?: string;
}

export function Stack({ children, space = 4, className }: StackProps) {
  return (
    <div className={cn(`space-y-${space}`, className)}>
      {children}
    </div>
  );
}

interface ActionBarProps {
  children: ReactNode;
  className?: string;
}

export function ActionBar({ children, className }: ActionBarProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {children}
    </div>
  );
}