"""
Creature Sanctuary Game - Python Implementation
Requires: pip install pymysql pillow
"""

import pymysql
import random
import os
from datetime import datetime
from typing import Optional, List, Dict

# Image display support
try:
    from PIL import Image, ImageTk
    import tkinter as tk
    IMAGE_SUPPORT = True
except ImportError:
    IMAGE_SUPPORT = False
    print("Note: Install Pillow for image display: pip install pillow")


class Database:
    """Database connection handler"""

    def __init__(self, host='localhost', user='root', password='123456789', database='creature_catcher'):
        self.connection = pymysql.connect(
            host=host,
            user=user,
            password=password,
            database=database,
            charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor
        )

    def execute(self, query: str, params: Optional[tuple] = None) -> List[Dict]:
        with self.connection.cursor() as cursor:
            cursor.execute(query, params or ())
            return cursor.fetchall()

    def execute_one(self, query: str, params: Optional[tuple] = None) -> Optional[Dict]:
        with self.connection.cursor() as cursor:
            cursor.execute(query, params or ())
            return cursor.fetchone()

    def execute_commit(self, query: str, params: Optional[tuple] = None) -> int:
        with self.connection.cursor() as cursor:
            cursor.execute(query, params or ())
            self.connection.commit()
            return cursor.lastrowid

    def close(self):
        self.connection.close()


def show_image_window(image_path: str, creature_name: str, duration: float = 0) -> None:
    """Display creature image in a Tkinter window"""
    if not IMAGE_SUPPORT:
        return

    if not image_path or not os.path.exists(image_path):
        print(f"      [Image file not found: {image_path}]")
        return

    try:
        img = Image.open(image_path)
        max_size = 300
        img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)

        window = tk.Tk()
        window.title(creature_name)

        photo = ImageTk.PhotoImage(img)
        label = tk.Label(window, image=photo)
        label.image = photo  # Keep a reference!
        label.pack()

        screen_width = window.winfo_screenwidth()
        screen_height = window.winfo_screenheight()
        window_width = img.width
        window_height = img.height
        x = (screen_width - window_width) // 2
        y = (screen_height - window_height) // 2
        window.geometry(f"{window_width}x{window_height}+{x}+{y}")

        window.attributes('-topmost', True)

        if duration > 0:
            window.after(int(duration * 1000), window.destroy)

        window.mainloop()

    except Exception as e:
        print(f"      [Error displaying image: {e}]")


class Type:
    """Creature type"""

    def __init__(self, id: int, name: str, description: str):
        self.id = id
        self.name = name
        self.description = description

    @classmethod
    def from_db(cls, db: Database, type_id: int) -> 'Type':
        result = db.execute_one("SELECT * FROM types WHERE id = %s", (type_id,))
        return cls(result['id'], result['name'], result['description'])

    def get_effectiveness(self, db: Database, defender_type_id: int) -> float:
        """Get attraction multiplier against another type"""
        result = db.execute_one(
            "SELECT multiplier FROM type_relationships WHERE attacker_type_id = %s AND defender_type_id = %s",
            (self.id, defender_type_id)
        )
        return float(result['multiplier']) if result else 1.0


class Creature:
    """Base creature species"""

    def __init__(self, id: int, name: str, type_obj: Type, rarity: str, description: str,
                 image_path: Optional[str] = None):
        self.id = id
        self.name = name
        self.type = type_obj
        self.rarity = rarity
        self.description = description
        self.image_path = image_path

    @classmethod
    def from_db(cls, db: Database, creature_id: int) -> Optional['Creature']:
        result = db.execute_one("SELECT * FROM creatures WHERE id = %s", (creature_id,))
        if not result:
            return None
        type_obj = Type.from_db(db, result['type_id'])
        return cls(
            result['id'],
            result['name'],
            type_obj,
            result['rarity'],
            result['description'],
            result.get('image_path')
        )

    @classmethod
    def get_all(cls, db: Database) -> List['Creature']:
        results = db.execute("SELECT id FROM creatures")
        return [cls.from_db(db, r['id']) for r in results if cls.from_db(db, r['id'])]


class PlayerCreature:
    """A creature in the player's sanctuary"""

    def __init__(self, id: int, player_id: int, creature: Creature,
                 nickname: Optional[str], habitat_id: Optional[int],
                 habitat_slot: Optional[int], happiness: int, caught_at: datetime):
        self.id = id
        self.player_id = player_id
        self.creature = creature
        self.nickname = nickname or creature.name
        self.habitat_id = habitat_id
        self.habitat_slot = habitat_slot
        self.happiness = happiness
        self.caught_at = caught_at

    @classmethod
    def from_db(cls, db: Database, player_creature_id: int) -> Optional['PlayerCreature']:
        result = db.execute_one("SELECT * FROM player_creatures WHERE id = %s", (player_creature_id,))
        if not result:
            return None
        creature = Creature.from_db(db, result['creature_id'])
        if not creature:
            return None
        return cls(
            result['id'], result['player_id'], creature, result['nickname'],
            result['habitat_id'], result['habitat_slot'],
            result['happiness'], result['caught_at']
        )


class Habitat:
    """A habitat that can hold up to 5 creatures"""

    MAX_SLOTS = 4

    def __init__(self, id: int, number: int, creatures: List[PlayerCreature]):
        self.id = id
        self.number = number
        self.creatures = creatures

    def is_full(self) -> bool:
        return len(self.creatures) >= self.MAX_SLOTS

    def calculate_happiness(self, db: Database) -> Dict[int, float]:
        """Calculate happiness for each creature based on habitat mates"""
        happiness_scores = {}

        for creature in self.creatures:
            if len(self.creatures) == 1:
                happiness_scores[creature.id] = 70
            else:
                total_compat = 0
                count = 0
                for other in self.creatures:
                    if other.id != creature.id:
                        compat = creature.creature.type.get_effectiveness(db, other.creature.type.id)
                        total_compat += compat
                        count += 1
                avg_compat = total_compat / count if count > 0 else 1.0
                happiness_scores[creature.id] = avg_compat * 50 + 20

        return happiness_scores

    def update_happiness(self, db: Database):
        """Recalculate and save happiness for all creatures in habitat"""
        happiness_scores = self.calculate_happiness(db)
        for creature_id, happiness in happiness_scores.items():
            db.execute_commit(
                "UPDATE player_creatures SET happiness = %s WHERE id = %s",
                (int(happiness), creature_id)
            )
            for creature in self.creatures:
                if creature.id == creature_id:
                    creature.happiness = int(happiness)


class Player:
    """Game player"""

    def __init__(self, id: int, username: str, email: Optional[str]):
        self.id = id
        self.username = username
        self.email = email

    @classmethod
    def create(cls, db: Database, username: str, email: Optional[str] = None) -> 'Player':
        player_id = db.execute_commit(
            "INSERT INTO players (username, email) VALUES (%s, %s)",
            (username, email)
        )
        for i in range(1, 5):
            db.execute_commit(
                "INSERT INTO habitats (player_id, habitat_number) VALUES (%s, %s)",
                (player_id, i)
            )
        return cls.from_db(db, player_id)

    @classmethod
    def from_db(cls, db: Database, player_id: int) -> Optional['Player']:
        result = db.execute_one("SELECT * FROM players WHERE id = %s", (player_id,))
        if not result:
            return None
        return cls(result['id'], result['username'], result['email'])

    @classmethod
    def get_by_username(cls, db: Database, username: str) -> Optional['Player']:
        result = db.execute_one("SELECT * FROM players WHERE username = %s", (username,))
        if not result:
            return None
        return cls(result['id'], result['username'], result['email'])

    def get_habitats(self, db: Database) -> List[Habitat]:
        """Get all habitats with their creatures"""
        habitat_results = db.execute(
            "SELECT * FROM habitats WHERE player_id = %s ORDER BY habitat_number",
            (self.id,)
        )
        habitats = []
        for h in habitat_results:
            creature_results = db.execute(
                "SELECT id FROM player_creatures WHERE player_id = %s AND habitat_id = %s ORDER BY habitat_slot",
                (self.id, h['id'])
            )
            creatures = [PlayerCreature.from_db(db, c['id']) for c in creature_results 
                        if PlayerCreature.from_db(db, c['id'])]
            habitats.append(Habitat(h['id'], h['habitat_number'], creatures))
        return habitats

    def get_unplaced_creatures(self, db: Database) -> List[PlayerCreature]:
        """Get creatures not in any habitat"""
        results = db.execute(
            "SELECT id FROM player_creatures WHERE player_id = %s AND habitat_id IS NULL",
            (self.id,)
        )
        return [PlayerCreature.from_db(db, r['id']) for r in results 
                if PlayerCreature.from_db(db, r['id'])]

    def are_all_happy(self, db: Database) -> bool:
        """Check if all creatures are happy (happiness >= 30)"""
        result = db.execute_one(
            "SELECT COUNT(*) as unhappy FROM player_creatures WHERE player_id = %s AND happiness < 30",
            (self.id,)
        )
        return result['unhappy'] == 0

    def get_discovered_species(self, db: Database) -> List[int]:
        """Get list of discovered creature IDs"""
        results = db.execute(
            "SELECT DISTINCT creature_id FROM player_creatures WHERE player_id = %s",
            (self.id,)
        )
        return [r['creature_id'] for r in results]

    def catch_creature(self, db: Database, creature: Creature) -> PlayerCreature:
        """Add a new creature to sanctuary (unplaced)"""
        player_creature_id = db.execute_commit(
            "INSERT INTO player_creatures (player_id, creature_id, happiness) VALUES (%s, %s, %s)",
            (self.id, creature.id, 70)
        )
        return PlayerCreature.from_db(db, player_creature_id)


class Game:
    """Main game class"""

    def __init__(self, db: Database):
        self.db = db
        self.player: Optional[Player] = None

    def login_or_create(self, username: str):
        """Login or create a new player"""
        self.player = Player.get_by_username(self.db, username)
        if not self.player:
            print(f"\n🌟 Creating new sanctuary for {username}...")
            self.player = Player.create(self.db, username)
            starter = Creature.from_db(self.db, 1)
            pc = self.player.catch_creature(self.db, starter)
            print(f"✨ You received your first creature: {starter.name} ({starter.type.name} type)!")
            print(f"📖 {starter.description}")

            habitats = self.player.get_habitats(self.db)
            self.db.execute_commit(
                "UPDATE player_creatures SET habitat_id = %s, habitat_slot = 1 WHERE id = %s",
                (habitats[0].id, pc.id)
            )
            print(f"🏠 {starter.name} has been placed in Habitat 1\n")
        else:
            print(f"\n👋 Welcome back to your sanctuary, {username}!\n")

    def explore_territory(self):
        """Main exploration flow"""
        unplaced = self.player.get_unplaced_creatures(self.db)
        if unplaced:
            print("\n⚠️  You have unplaced creatures! Place all creatures in habitats before exploring.")
            print(f"📦 {len(unplaced)} creature(s) need placement.\n")
            return

        if not self.player.are_all_happy(self.db):
            print("\n⚠️  Some creatures are unhappy! You must fix happiness before exploring.")
            print("Rearrange creatures in habitats or release unhappy ones.\n")
            return

        habitats = self.player.get_habitats(self.db)
        all_creatures = []
        for habitat in habitats:
            all_creatures.extend(habitat.creatures)

        if not all_creatures:
            print("\n❌ You have no creatures to take as companions!\n")
            return

        print("\n🎒 Choose a companion for exploration:")
        for i, pc in enumerate(all_creatures, 1):
            print(f"  [{i}] {pc.nickname} ({pc.creature.type.name}) - Happiness: {pc.happiness}%")

        choice = input("\nSelect companion (number): ").strip()
        try:
            companion = all_creatures[int(choice) - 1]
        except (ValueError, IndexError):
            print("Invalid choice!")
            return

        print(f"\n🌿 {companion.nickname} joins you for exploration!\n")

        all_species = Creature.get_all(self.db)
        discovered = self.player.get_discovered_species(self.db)
        undiscovered = [c for c in all_species if c.id not in discovered]

        if len(discovered) >= 16:
            print("\n🎊 ═══════════════════════════════════════════════════ 🎊")
            print("   🌟 CONGRATULATIONS! YOU'VE CAUGHT THEM ALL! 🌟")
            print("🎊 ═══════════════════════════════════════════════════ 🎊")
            print("\n   You've discovered all 16 creature species!")
            print("   Your sanctuary is complete!\n")
            return

        num_to_show = min(3, len(undiscovered))
        wild_choices = random.sample(undiscovered, num_to_show)

        if num_to_show == 1:
            print("🔍 You encounter a wild creature:")
        else:
            print(f"🔍 You encounter {num_to_show} wild creatures:")

        for i, wild in enumerate(wild_choices, 1):
            effectiveness = companion.creature.type.get_effectiveness(self.db, wild.type.id)
            status = "✅ Strong" if effectiveness >= 2.0 else "🟡 Normal" if effectiveness >= 1.0 else "❌ Weak"
            print(f"  [{i}] {wild.name} ({wild.type.name}) - {status} attraction - ✨ NEW!")
            print(f"      {wild.description}")

        choice_range = f"1-{num_to_show}" if num_to_show > 1 else "1"
        choice = input(f"\nWhich creature to approach? ({choice_range} or 0 to leave): ").strip()
        try:
            if choice == '0':
                print("You decide to leave peacefully.\n")
                return
            target = wild_choices[int(choice) - 1]
        except (ValueError, IndexError):
            print("Invalid choice!")
            return

        effectiveness = companion.creature.type.get_effectiveness(self.db, target.type.id)
        base_chance = 0.3
        modified_chance = min(0.95, base_chance * effectiveness)

        print(f"\n🎯 Attempting to attract {target.name}...")
        print(f"   Base chance: 30%")
        print(f"   Type multiplier: {effectiveness}x")
        print(f"   Final chance: {int(modified_chance * 100)}%\n")

        if random.random() < modified_chance:
            print(f"🎉 Success! {target.name} trusts you and joins your sanctuary!")

            if IMAGE_SUPPORT and target.image_path:
                print(f"\n🖼️ {target.name} appears before you!")
                print("(Image will show for 3 seconds...)")
                show_image_window(target.image_path, target.name, duration=3)

            self.player.catch_creature(self.db, target)
            print(f"✨ {target.name} has been added to your unplaced creatures.\n")
        else:
            print(f"😞 {target.name} was not convinced and fled. Better luck next time!\n")

    def manage_habitats(self):
        """View and manage habitats"""
        habitats = self.player.get_habitats(self.db)
        unplaced = self.player.get_unplaced_creatures(self.db)

        print("\n🏠 === SANCTUARY HABITATS ===\n")

        for habitat in habitats:
            print(f"Habitat {habitat.number} ({len(habitat.creatures)}/{Habitat.MAX_SLOTS} creatures):")
            if habitat.creatures:
                for i, pc in enumerate(habitat.creatures, 1):
                    emoji = "😊" if pc.happiness >= 70 else "😐" if pc.happiness >= 30 else "😢"
                    print(f"  [{i}] {emoji} {pc.nickname} ({pc.creature.type.name}) - {pc.happiness}% happy")
            else:
                print("  (empty)")
            print()

        print(f"📦 Unplaced Creatures ({len(unplaced)}):")
        if unplaced:
            for i, pc in enumerate(unplaced, 1):
                print(f"  [{i}] {pc.nickname} ({pc.creature.type.name})")
        else:
            print("  (none)")

        print("\n[1] Move creature  [2] Release creature  [3] View creature image  [0] Back")
        choice = input("Action: ").strip()

        if choice == '1':
            self.move_creature(habitats, unplaced)
        elif choice == '2':
            self.release_creature(habitats, unplaced)
        elif choice == '3':
            all_creatures = []
            for h in habitats:
                all_creatures.extend(h.creatures)
            all_creatures.extend(unplaced)

            if all_creatures:
                print("\nSelect creature to view:")
                for i, pc in enumerate(all_creatures, 1):
                    print(f"[{i}] {pc.nickname} ({pc.creature.type.name})")

                try:
                    idx = int(input("Choose: ").strip()) - 1
                    if 0 <= idx < len(all_creatures):
                        creature = all_creatures[idx]
                        if IMAGE_SUPPORT and creature.creature.image_path:
                            print(f"\n🖼️ Displaying {creature.nickname}...")
                            print("(Close the image window to continue)")
                            show_image_window(creature.creature.image_path, creature.nickname)
                        else:
                            print("No image available for this creature.")
                except (ValueError, IndexError):
                    print("Invalid choice!")
            else:
                print("No creatures to view!")

    def move_creature(self, habitats: List[Habitat], unplaced: List[PlayerCreature]):
        """Move a creature between habitats or to/from unplaced"""
        print("\nEnter creature to move (format: 'H1-2' for Habitat 1 slot 2, or 'U3' for Unplaced #3):")
        source = input("Source: ").strip().upper()

        creature_to_move = None
        if source.startswith('H'):
            parts = source[1:].split('-')
            try:
                h_num = int(parts[0]) - 1
                slot = int(parts[1]) - 1
                creature_to_move = habitats[h_num].creatures[slot]
            except (ValueError, IndexError):
                print("Invalid source!")
                return
        elif source.startswith('U'):
            try:
                idx = int(source[1:]) - 1
                creature_to_move = unplaced[idx]
            except (ValueError, IndexError):
                print("Invalid source!")
                return
        else:
            print("Invalid format!")
            return

        print(f"\nMoving {creature_to_move.nickname}...")
        print("Enter destination ('H1' for Habitat 1, 'U' for unplaced):")
        dest = input("Destination: ").strip().upper()

        if dest.startswith('H'):
            try:
                h_num = int(dest[1:])
                target_habitat = habitats[h_num - 1]
                if target_habitat.is_full():
                    print("That habitat is full!")
                    return
                new_slot = len(target_habitat.creatures) + 1
                self.db.execute_commit(
                    "UPDATE player_creatures SET habitat_id = %s, habitat_slot = %s WHERE id = %s",
                    (target_habitat.id, new_slot, creature_to_move.id)
                )
                print(f"✅ Moved {creature_to_move.nickname} to Habitat {h_num}")
                target_habitat.creatures.append(creature_to_move)
                target_habitat.update_happiness(self.db)
                print(f"Updated happiness for Habitat {h_num}\n")
            except (ValueError, IndexError):
                print("Invalid destination!")
        elif dest == 'U':
            self.db.execute_commit(
                "UPDATE player_creatures SET habitat_id = NULL, habitat_slot = NULL WHERE id = %s",
                (creature_to_move.id,)
            )
            print(f"✅ Moved {creature_to_move.nickname} to unplaced creatures\n")

    def release_creature(self, habitats: List[Habitat], unplaced: List[PlayerCreature]):
        """Release a creature from the sanctuary"""
        all_creatures = []
        for h in habitats:
            all_creatures.extend(h.creatures)
        all_creatures.extend(unplaced)

        if not all_creatures:
            print("No creatures to release!")
            return

        if len(all_creatures) == 1:
            print("\n❌ You cannot release your last creature!")
            print("You must always keep at least one creature in your sanctuary.\n")
            return

        print("\nCreatures:")
        for i, pc in enumerate(all_creatures, 1):
            print(f"[{i}] {pc.nickname} ({pc.creature.type.name}) - {pc.happiness}% happy")

        choice = input("\nRelease which creature? (0 to cancel): ").strip()
        try:
            if choice == '0':
                return
            to_release = all_creatures[int(choice) - 1]
        except (ValueError, IndexError):
            print("Invalid choice!")
            return

        confirm = input(f"Are you sure you want to release {to_release.nickname}? (yes/no): ").strip().lower()
        if confirm == 'yes':
            self.db.execute_commit(
                "DELETE FROM player_creatures WHERE id = %s",
                (to_release.id,)
            )
            print(f"✅ {to_release.nickname} has been released back to the wild.\n")
        else:
            print("Cancelled.\n")

    def view_journal(self):
        """View discovered species"""
        discovered = self.player.get_discovered_species(self.db)
        all_species = Creature.get_all(self.db)

        print("\n📖 === FIELD JOURNAL ===\n")
        print(f"Discovered: {len(discovered)}/{len(all_species)} species\n")

        discovered_creatures = []

        for creature in all_species:
            if creature.id in discovered:
                print(f"✅ {creature.name} ({creature.type.name})")
                print(f"   {creature.description}\n")
                discovered_creatures.append(creature)
            else:
                print(f"❓ ??? - Not yet discovered\n")

        if IMAGE_SUPPORT and discovered_creatures:
            print("\n💡 Tip: Enter a creature number to view its image, or 0 to go back")
            choice = input("View creature image (number or 0): ").strip()

            try:
                idx = int(choice) - 1
                if 0 <= idx < len(discovered_creatures):
                    creature = discovered_creatures[idx]
                    if creature.image_path:
                        print(f"\n🖼️ Displaying {creature.name}...")
                        print("(Close the image window to continue)")
                        show_image_window(creature.image_path, creature.name)
            except (ValueError, IndexError):
                pass

    def main_menu(self):
        """Main game menu"""
        while True:
            habitats = self.player.get_habitats(self.db)
            all_happy = self.player.are_all_happy(self.db)

            total_creatures = sum(len(h.creatures) for h in habitats)
            total_creatures += len(self.player.get_unplaced_creatures(self.db))

            print(f"\n{'=' * 50}")
            print(f"{self.player.username}'s Sanctuary")
            print(f"{'=' * 50}")
            print(f"Creatures: {total_creatures} | Status: {'✅ All Happy' if all_happy else '⚠️ Unhappy creatures!'}")
            print(f"\n[1] 🗺️ Explore Territory")
            print(f"[2] 🏠 Manage Habitats")
            print(f"[3] 📖 View Field Journal")
            print(f"[4] 🚪 Exit")

            choice = input("\nChoose action: ").strip()

            if choice == '1':
                self.explore_territory()
            elif choice == '2':
                self.manage_habitats()
            elif choice == '3':
                self.view_journal()
            elif choice == '4':
                print("\n👋 Thanks for playing! Your sanctuary awaits your return.\n")
                break


if __name__ == "__main__":
    print("\n🌟 Welcome to Creature Sanctuary! 🌟\n")

    if IMAGE_SUPPORT:
        print("✅ Image display enabled! (Images will pop up in windows)\n")
    else:
        print("⚠️ Image display disabled (install Pillow: pip install pillow)\n")

    print("Connecting to database...")
    try:
        db = Database(
            host='localhost',
            user='root',
            password='123456789',
            database='creature_catcher'
        )
        print("✅ Connected!\n")
    except Exception as e:
        print(f"Failed to connect to database: {e}")
        print("Make sure MariaDB is running and the database is created.")
        exit(1)

    username = input("Enter your username: ").strip()

    game = Game(db)
    game.login_or_create(username)
    game.main_menu()

    db.close()
