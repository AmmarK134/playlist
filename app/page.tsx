"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  Check,
  Disc3,
  Sparkles,
} from "lucide-react";
import { moods } from "@/lib/studio";

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [activeMood, setActiveMood] = useState("");
  const [recordPlaying, setRecordPlaying] = useState(true);
  function createPlaylist(value = prompt) {
    if (!value.trim()) {
      document.getElementById("playlist-prompt")?.focus();
      return;
    }
    router.push(
      `/dashboard?view=create${session ? "" : "&demo=1"}&prompt=${encodeURIComponent(value.trim())}`,
    );
  }
  return (
    <div className="discover-page page-enter">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="live-dot" />
            LESS ALGORITHM. MORE YOU.
          </div>
          <h1 id="hero-title">
            Find your
            <br />
            <span className="serif-word">frequency.</span>
            <span className="title-star" aria-hidden="true">
              ✳
            </span>
          </h1>
          <p>
            The late nights. The long drives. The just-because.
            <br className="desktop-break" /> Turn whatever you’re feeling into
            your next favorite playlist.
          </p>
          <a href="#create" className="hero-anchor">
            Let’s set the mood <ArrowDown size={15} />
          </a>
        </div>
        <div
          className={`record-scene ${recordPlaying ? "is-spinning" : "is-paused"}`}
        >
          <div className="record-orbit orbit-one" />
          <div className="record-orbit orbit-two" />
          <span className="orbit-star" aria-hidden="true">
            ✦
          </span>
          <span className="scene-index">SIDE A / YOUR NEXT OBSESSION</span>
          <div className="record-sleeve">
            <span className="sleeve-kicker">PLAYLISTHELPER PRESENTS</span>
            <span className="sleeve-title">
              The art
              <br />
              of tuning
              <br />
              <i>in.</i>
            </span>
            <span className="sleeve-grid" />
            <span className="sleeve-footer">
              A SOUNDTRACK FOR EVERY VERSION OF YOU.
            </span>
          </div>
          <button
            className="vinyl"
            onClick={() => setRecordPlaying(!recordPlaying)}
            aria-label={
              recordPlaying
                ? "Pause record animation"
                : "Resume record animation"
            }
            aria-pressed={recordPlaying}
          >
            <span className="vinyl-sheen" />
            <span className="vinyl-label">
              <span>PH — STEREO</span>
              <AudioLines size={37} strokeWidth={1.3} />
              <span>33⅓ RPM · VOL. 01</span>
              <i />
            </span>
          </button>
          <div className="record-caption">
            <span className="equalizer" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </span>
            <span>GOOD TASTE. ON REPEAT.</span>
            <span>01—∞</span>
          </div>
        </div>
      </section>
      <section
        id="create"
        className="composer"
        aria-labelledby="composer-title"
      >
        <div className="composer-top">
          <div className="composer-heading">
            <span className="sparkle-box">
              <Sparkles size={16} />
            </span>
            <h2 id="composer-title">What does your day sound like?</h2>
          </div>
          <span className="small-label composer-tag">
            YOUR IDEA. A WHOLE PLAYLIST.
          </span>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            createPlaylist();
          }}
        >
          <label htmlFor="playlist-prompt" className="sr-only">
            Describe your playlist
          </label>
          <div className="prompt-row">
            <input
              id="playlist-prompt"
              value={prompt}
              onChange={(event) => {
                setPrompt(event.target.value);
                setActiveMood("");
              }}
              placeholder="A midnight drive through the city, a little nostalgic…"
              maxLength={1000}
              required
              autoComplete="off"
            />
            <button className="button button-primary" type="submit">
              Find my sound <ArrowUpRight size={17} />
            </button>
          </div>
        </form>
        <div className="mood-chips">
          <span>Or start with a feeling</span>
          {[
            { label: "After hours", emoji: "☾", id: 0 },
            { label: "Golden hour", emoji: "☀", id: 1 },
            { label: "Deep focus", emoji: "◎", id: 2 },
            { label: "Weekend energy", emoji: "↗", id: 3 },
          ].map((item) => (
            <button
              key={item.id}
              className={`mood-chip ${activeMood === item.label ? "selected" : ""}`}
              onClick={() => {
                setPrompt(moods[item.id].prompt);
                setActiveMood(item.label);
              }}
            >
              <span aria-hidden="true">
                {activeMood === item.label ? <Check size={12} /> : item.emoji}
              </span>
              {item.label}
            </button>
          ))}
        </div>
      </section>
      <section className="mood-section" aria-labelledby="mood-title">
        <div className="section-heading">
          <div>
            <div className="eyebrow">A LITTLE INSPIRATION</div>
            <h2 id="mood-title">
              Every mood has a <i>soundtrack.</i>
            </h2>
          </div>
          <Link href="/dashboard?demo=1" className="text-link">
            Explore the studio <ArrowRight size={16} />
          </Link>
        </div>
        <div className="mood-grid">
          {moods.map((mood, index) => (
            <button
              className="mood-card"
              key={mood.id}
              onClick={() => createPlaylist(mood.prompt)}
            >
              <div className="mood-artwork">
                <Image
                  src={mood.cover}
                  alt={`Original abstract artwork for ${mood.title}`}
                  fill
                  sizes="(max-width: 600px) 45vw, (max-width: 1000px) 36vw, 22vw"
                />
                <span className="cover-number">0{index + 1} / PH SELECTS</span>
                <span className="cover-title">
                  {mood.title.split(" ").slice(0, -1).join(" ")}
                  <br />
                  <i>{mood.title.split(" ").at(-1)}</i>
                </span>
                <span className="cover-action">
                  <ArrowUpRight size={21} />
                </span>
              </div>
              <div className="mood-card-meta">
                <h3>{mood.title}</h3>
                <span
                  className="mood-color"
                  style={{ background: mood.color }}
                />
              </div>
              <p>{mood.note}</p>
              <span className="mood-genre">{mood.genre}</span>
            </button>
          ))}
        </div>
      </section>
      <section
        id="how-it-works"
        className="how-section"
        aria-labelledby="how-title"
      >
        <div className="how-intro">
          <Disc3 size={29} strokeWidth={1} />
          <h2 id="how-title">
            From a feeling
            <br />
            to <i>the first track.</i>
          </h2>
          <span>No perfect prompt required.</span>
        </div>
        <div className="how-step">
          <span>01</span>
          <h3>Bring a feeling.</h3>
          <p>A mood, a memory, an oddly specific Tuesday. Start anywhere.</p>
        </div>
        <div className="how-step">
          <span>02</span>
          <h3>Make it yours.</h3>
          <p>
            Shape your idea with the assistant. Set the mood and the number of
            tracks.
          </p>
        </div>
        <div className="how-step">
          <span>03</span>
          <h3>Keep it on repeat.</h3>
          <p>
            Save your playlist to Spotify. Your new soundtrack goes wherever you
            do.
          </p>
        </div>
      </section>
    </div>
  );
}
