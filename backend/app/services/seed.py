from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Friendship, Group, GroupMembership, TrackShare, User
from app.security import hash_password
from app.services.metadata import ResolvedTrack, TrackSource


def seed_database(db: Session) -> None:
    existing_user = db.scalar(select(User).limit(1))
    if existing_user is not None:
        return

    users = {
        username: User(
            email=f"{username}@example.com",
            username=username,
            display_name=display_name,
            bio=bio,
            avatar_url=f"https://api.dicebear.com/9.x/initials/svg?seed={display_name.replace(' ', '%20')}",
            password_hash=hash_password("TuneTribe!123"),
        )
        for username, display_name, bio in [
            ("alex", "Alex Rivera", "Electronic music enthusiast. Jazz on weekends."),
            ("maya", "Maya Chen", "Indie curator and playlist builder."),
            ("joe", "Joe Park", "Late-night jazz and left-field soul."),
            ("kim", "Kim Reyes", "Post-punk, dream pop, and deep cuts."),
            ("sam", "Sam Okonkwo", "Hip-hop obsessive and R&B collector."),
            ("lee", "Lee Tanaka", "Instrumentals, ambient, and focus music."),
            ("nina", "Nina Volkov", "House, disco, and after-hours tracks."),
            ("chris", "Chris Moreau", "Guitar records and live sessions."),
            ("pat", "Pat Singh", "Workout playlists and pop hooks."),
            ("dan", "Dan Kowalski", "Shoegaze, indie, and new releases."),
            ("eli", "Eli Torres", "Global beats and alt-pop."),
            ("rue", "Rue Martin", "Eclectic mixes and forgotten gems."),
        ]
    }
    db.add_all(users.values())
    db.flush()

    for friend_username in ["maya", "joe", "sam", "chris", "eli"]:
        db.add(Friendship(user_id=users["alex"].id, friend_id=users[friend_username].id))

    groups = [
        _create_group(db, "The Heavy Rotation", users["alex"], ["alex", "maya", "joe", "kim", "sam", "lee"]),
        _create_group(db, "Late Night Jams", users["alex"], ["alex", "nina", "chris", "pat"]),
        _create_group(db, "Workout Fuel", users["alex"], ["alex", "maya", "joe", "kim", "sam", "lee", "nina", "chris"]),
        _create_group(db, "Jazz Explorers", users["alex"], ["alex", "joe", "pat"]),
        _create_group(db, "New Releases", users["alex"], ["alex", "maya", "joe", "kim", "sam", "lee", "nina", "chris", "pat", "dan", "eli", "rue"]),
    ]
    db.flush()

    seeded_tracks = [
        ("The Heavy Rotation", "alex", _demo_track("Never Gonna Give You Up", "Rick Astley", "Pop", TrackSource.SPOTIFY, "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT")),
        ("The Heavy Rotation", "maya", _demo_track("Never Gonna Give You Up", "Rick Astley", "Pop", TrackSource.APPLE_MUSIC, "https://music.apple.com/us/album/never-gonna-give-you-up/1559523357?i=1559523358")),
        ("The Heavy Rotation", "joe", _demo_track("Never Gonna Give You Up", "Rick Astley", "Pop", TrackSource.YOUTUBE, "https://www.youtube.com/watch?v=dQw4w9WgXcQ")),
        ("Late Night Jams", "nina", _demo_track("Midnight City", "M83", "Electronic", TrackSource.YOUTUBE_MUSIC, "https://music.youtube.com/watch?v=dX3k_QDnzHE")),
        ("Late Night Jams", "chris", _demo_track("Dreams", "Fleetwood Mac", "Rock", TrackSource.SPOTIFY, "https://open.spotify.com/track/0ofHAoxe9vBkTCp2UQIavz")),
        ("Workout Fuel", "sam", _demo_track("Stronger", "Kanye West", "Hip-Hop/Rap", TrackSource.YOUTUBE, "https://www.youtube.com/watch?v=PsO6ZnUZI0g")),
        ("Workout Fuel", "pat", _demo_track("Titanium", "David Guetta", "Dance", TrackSource.APPLE_MUSIC, "https://music.apple.com/us/album/titanium-feat-sia/1440857781?i=1440857798")),
        ("Jazz Explorers", "joe", _demo_track("Tadow", "Masego & FKJ", "Jazz", TrackSource.YOUTUBE, "https://www.youtube.com/watch?v=hC8CH0Z3L54")),
        ("New Releases", "dan", _demo_track("Genesis", "Grimes", "Electronic", TrackSource.SPOTIFY, "https://open.spotify.com/track/5qS1X0xqvHsD5N2qP5QmB0")),
        ("New Releases", "eli", _demo_track("Motion Sickness", "Phoebe Bridgers", "Alternative", TrackSource.APPLE_MUSIC, "https://music.apple.com/us/album/motion-sickness/1225030842?i=1225031038")),
    ]

    now = datetime.now(timezone.utc)
    for index, (group_name, username, resolved) in enumerate(seeded_tracks):
        group = next(group for group in groups if group.name == group_name)
        track = TrackShare(
            group_id=group.id,
            shared_by_id=users[username].id,
            source=resolved.source,
            source_url=resolved.source_url,
            source_identifier=resolved.source_identifier,
            title=resolved.title,
            artist=resolved.artist,
            album=resolved.album,
            genre=resolved.genre,
            album_art_url=resolved.album_art_url,
            duration_ms=resolved.duration_ms,
            track_signature=resolved.signature,
            shared_at=now - timedelta(hours=index * 9),
        )
        db.add(track)

    db.commit()


def _create_group(db: Session, name: str, owner: User, usernames: list[str]) -> Group:
    group = Group(name=name, owner_id=owner.id)
    db.add(group)
    db.flush()

    for username in usernames:
        db.add(
            GroupMembership(
                group_id=group.id,
                user_id=db.scalar(select(User.id).where(User.username == username)),
                role="owner" if username == owner.username else "member",
            )
        )

    return group


def _demo_track(title: str, artist: str, genre: str, source: str, url: str) -> ResolvedTrack:
    return ResolvedTrack(
        source=source,
        source_url=url,
        source_identifier=None,
        title=title,
        artist=artist,
        album=None,
        genre=genre,
        album_art_url=None,
        duration_ms=None,
    )
