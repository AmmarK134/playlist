import { Music } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-gray-800 bg-black/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <Music className="h-6 w-6 text-green-500" />
            <span className="text-lg font-semibold text-white">PlaylistHelper</span>
          </div>
          
          <div className="flex space-x-6 text-sm text-gray-400">
            <a href="#" className="hover:text-white transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Terms
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Support
            </a>
          </div>
        </div>
        
        <div className="mt-6 pt-6 border-t border-gray-800 text-center text-sm text-gray-500">
          <p>&copy; 2024 PlaylistHelper. Built with Next.js, Spotify API, and AI.</p>
        </div>
      </div>
    </footer>
  )
}
