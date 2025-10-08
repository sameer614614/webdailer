import { forwardRef } from "react";
import type { LabelHTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export type LabelProps = LabelHTMLAttributes<HTMLLabelElement>;

const Label = forwardRef<HTMLLabelElement, LabelProps>(({ className, ...props }, ref) => (
  <label ref={ref} className={cn("text-sm font-medium leading-none", className)} {...props} />
));
Label.displayName = "Label";

export { Label };
