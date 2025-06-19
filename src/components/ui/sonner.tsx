import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast bg-white text-black border border-gray-200 shadow-lg",
          description: "text-gray-700",
          actionButton: "bg-gray-100 text-black",
          cancelButton: "bg-gray-200 text-black",
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
