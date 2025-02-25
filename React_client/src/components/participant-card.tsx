import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"

export function ParticipantCard({ name, hasVideo }: { name: string; hasVideo: boolean }) {
  return (
    <Card className="w-64">
      <CardContent className="p-4">
        {hasVideo ? (
          <div className="w-full h-48 bg-gray-300 rounded-md flex items-center justify-center">
            <span className="text-gray-600">Video Feed</span>
          </div>
        ) : (
          <Avatar className="w-full h-48">
            <AvatarImage src={`https://avatar.vercel.sh/${name}.png`} alt={name} />
            <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
        )}
        <p className="mt-2 text-center font-semibold">{name}</p>
      </CardContent>
    </Card>
  )
}

