import { ReactNode, ElementType, ComponentPropsWithoutRef } from "react";
import clsx from "clsx";

// Base typography props
interface TypographyProps<T extends ElementType = ElementType> {
  children: ReactNode;
  className?: string;
  as?: T;
}

// Helper type to extract props from element type
type TypographyPropsWithElement<T extends ElementType> = TypographyProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof TypographyProps<T>>;

// Heading Components
export function H1({ children, className, as: Component = "h1" }: TypographyProps) {
  return (
    <Component
      className={clsx(
        "text-4xl xl:text-5xl font-bold leading-tight",
        className
      )}
    >
      {children}
    </Component>
  );
}

export function H2({ children, className, as: Component = "h2" }: TypographyProps) {
  return (
    <Component
      className={clsx(
        "text-3xl md:text-4xl font-bold leading-tight",
        className
      )}
    >
      {children}
    </Component>
  );
}

export function H3({ children, className, as: Component = "h3" }: TypographyProps) {
  return (
    <Component
      className={clsx("text-2xl font-bold leading-tight", className)}
    >
      {children}
    </Component>
  );
}

export function H4({ children, className, as: Component = "h4" }: TypographyProps) {
  return (
    <Component
      className={clsx("text-xl font-semibold leading-tight", className)}
    >
      {children}
    </Component>
  );
}

export function H5({ children, className, as: Component = "h5" }: TypographyProps) {
  return (
    <Component
      className={clsx("text-lg font-semibold leading-tight", className)}
    >
      {children}
    </Component>
  );
}

export function H6({ children, className, as: Component = "h6" }: TypographyProps) {
  return (
    <Component
      className={clsx("text-base font-semibold leading-tight", className)}
    >
      {children}
    </Component>
  );
}

// Body Text Components
export function BodyLarge({
  children,
  className,
  as: Component = "p",
}: TypographyProps) {
  return (
    <Component
      className={clsx(
        "text-lg text-gray-700 dark:text-gray-300 leading-relaxed",
        className
      )}
    >
      {children}
    </Component>
  );
}

export function Body({ children, className, as: Component = "p" }: TypographyProps) {
  return (
    <Component
      className={clsx(
        "text-base text-gray-700 dark:text-gray-300 leading-normal",
        className
      )}
    >
      {children}
    </Component>
  );
}

export function BodySmall({
  children,
  className,
  as: Component = "p",
}: TypographyProps) {
  return (
    <Component
      className={clsx(
        "text-sm text-gray-600 dark:text-gray-400 leading-normal",
        className
      )}
    >
      {children}
    </Component>
  );
}

// Caption and Label Components
export function Caption({ children, className, as: Component = "span" }: TypographyProps) {
  return (
    <Component
      className={clsx(
        "text-xs text-gray-500 dark:text-gray-500 leading-normal",
        className
      )}
    >
      {children}
    </Component>
  );
}

export function Label({
  children,
  className,
  as: Component = "label",
}: TypographyProps) {
  return (
    <Component
      className={clsx(
        "text-sm font-medium text-gray-700 dark:text-gray-300",
        className
      )}
    >
      {children}
    </Component>
  );
}

export function LabelSmall({
  children,
  className,
  as: Component = "label",
}: TypographyProps) {
  return (
    <Component
      className={clsx(
        "text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider",
        className
      )}
    >
      {children}
    </Component>
  );
}

// Link Components
export function LinkText({
  children,
  className,
  as: Component = "a",
  ...props
}: TypographyProps & React.ComponentPropsWithoutRef<"a">) {
  return (
    <Component
      className={clsx(
        "text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

export function LinkTextLarge({
  children,
  className,
  as: Component = "a",
  ...props
}: TypographyProps & React.ComponentPropsWithoutRef<"a">) {
  return (
    <Component
      className={clsx(
        "text-base text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

// Special Typography Components
export function HeroTitle({
  children,
  className,
  as: Component = "h1",
}: TypographyProps) {
  return (
    <Component
      className={clsx(
        "text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500/90 to-purple-500/90 dark:from-blue-400 dark:to-purple-400",
        className
      )}
    >
      {children}
    </Component>
  );
}

export function SectionTitle({
  children,
  className,
  as: Component = "h2",
}: TypographyProps) {
  return (
    <Component
      className={clsx(
        "text-3xl md:text-4xl font-bold text-gray-900 dark:text-white",
        className
      )}
    >
      {children}
    </Component>
  );
}

export function SectionSubtitle({
  children,
  className,
  as: Component = "p",
}: TypographyProps) {
  return (
    <Component
      className={clsx(
        "text-lg text-gray-600 dark:text-gray-400",
        className
      )}
    >
      {children}
    </Component>
  );
}

export function FooterHeading({
  children,
  className,
  as: Component = "h3",
}: TypographyProps) {
  return (
    <Component
      className={clsx("text-sm font-semibold uppercase tracking-wider", className)}
    >
      {children}
    </Component>
  );
}

export function FooterText({
  children,
  className,
  as: Component = "p",
}: TypographyProps) {
  return (
    <Component
      className={clsx(
        "text-sm text-gray-500 dark:text-gray-400",
        className
      )}
    >
      {children}
    </Component>
  );
}

// Table and Data Display Components
export function TableCellText({
  children,
  className,
  as: Component = "span",
}: TypographyProps) {
  return (
    <Component
      className={clsx(
        "text-sm text-gray-700 dark:text-gray-300",
        className
      )}
    >
      {children}
    </Component>
  );
}

export function TableCellMono({
  children,
  className,
  as: Component = "span",
}: TypographyProps) {
  return (
    <Component
      className={clsx(
        "text-sm text-gray-700 dark:text-gray-300 font-mono",
        className
      )}
    >
      {children}
    </Component>
  );
}

export function TableCellSecondary({
  children,
  className,
  as: Component = "span",
}: TypographyProps) {
  return (
    <Component
      className={clsx(
        "text-xs text-gray-400 dark:text-gray-500",
        className
      )}
    >
      {children}
    </Component>
  );
}

export function TableCellLink({
  children,
  className,
  as: Component = "a",
  ...props
}: TypographyProps & React.ComponentPropsWithoutRef<"a">) {
  return (
    <Component
      className={clsx(
        "text-sm text-primary hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 underline",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

export function TableCellMonoLink({
  children,
  className,
  as: Component = "a",
  ...props
}: TypographyProps & React.ComponentPropsWithoutRef<"a">) {
  return (
    <Component
      className={clsx(
        "text-sm text-primary hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 underline font-mono",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

export function TableCellBold({
  children,
  className,
  as: Component = "span",
}: TypographyProps) {
  return (
    <Component
      className={clsx(
        "text-sm font-medium text-gray-900 dark:text-white",
        className
      )}
    >
      {children}
    </Component>
  );
}

// Utility function to combine typography classes
export const typography = {
  // Headings
  h1: "text-4xl xl:text-5xl font-bold leading-tight",
  h2: "text-3xl md:text-4xl font-bold leading-tight",
  h3: "text-2xl font-bold leading-tight",
  h4: "text-xl font-semibold leading-tight",
  h5: "text-lg font-semibold leading-tight",
  h6: "text-base font-semibold leading-tight",
  
  // Body
  bodyLarge: "text-lg text-gray-700 dark:text-gray-300 leading-relaxed",
  body: "text-base text-gray-700 dark:text-gray-300 leading-normal",
  bodySmall: "text-sm text-gray-600 dark:text-gray-400 leading-normal",
  
  // Caption & Label
  caption: "text-xs text-gray-500 dark:text-gray-500 leading-normal",
  label: "text-sm font-medium text-gray-700 dark:text-gray-300",
  labelSmall: "text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider",
  
  // Links
  link: "text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors",
  linkLarge: "text-base text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors",
  
  // Special
  heroTitle: "text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500/90 to-purple-500/90 dark:from-blue-400 dark:to-purple-400",
  sectionTitle: "text-3xl md:text-4xl font-bold text-gray-900 dark:text-white",
  sectionSubtitle: "text-lg text-gray-600 dark:text-gray-400",
  footerHeading: "text-sm font-semibold uppercase tracking-wider",
  footerText: "text-sm text-gray-500 dark:text-gray-400",
} as const;

