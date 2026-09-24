import Link from "next/link";
import { ArrowLeft, Disc3 } from "lucide-react";

export default function NotFound() {
  return (
    <div className="connect-page">
      <Disc3 size={70} strokeWidth={1} />
      <div className="eyebrow">404 / THE HIDDEN TRACK</div>
      <h1>
        This one’s
        <br />
        <i>off the record.</i>
      </h1>
      <p>That page isn’t in the collection. There’s plenty more to discover.</p>
      <Link href="/" className="button button-primary">
        <ArrowLeft size={16} />
        Back to Discover
      </Link>
    </div>
  );
}
