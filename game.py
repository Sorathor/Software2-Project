from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_cors import CORS
import random

from creature_game import Database, Game, Player, Creature, PlayerCreature, Habitat

app = Flask(__name__)
CORS(app)

##connect database
def get_db():
    return Database(
        host='localhost',
        user='root',
        password='123456789',
        database='creature_catcher'
    )


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/images/<path:filename>')
def serve_image(filename):
    return send_from_directory('images', filename)


@app.route('/login', methods=['POST'])
def login():
    """Login or create player"""
    data = request.json
    username = data.get('username', '').strip()

    if not username:
        return jsonify({'error': 'no username'}), 400

    messages = []

    try:
        db = get_db()
        game = Game(db)

        # Check if new player
        existing_player = Player.get_by_username(db, username)

        if not existing_player:
            messages.append(f"🌟 Creating new sanctuary for {username}...")
            game.login_or_create(username)
            starter = Creature.from_db(db, 1)
            messages.append(
                f"✨ You received your first creature: {starter.name} ({starter.type.name} type)!")
            messages.append(f"📖 {starter.description}")
            messages.append("")
            messages.append(f"🏠 {starter.name} has been placed in Habitat 1")
            messages.append("")
        else:
            game.login_or_create(username)
            messages.append(f"👋 Welcome back to your sanctuary, {username}!")
            messages.append("")

        return jsonify({
            'success': True,
            'messages': messages,
            'player_id': game.player.id,
            'username': game.player.username
        })

    except Exception as e:
        messages.append(f"❌ Error: {str(e)}")
        return jsonify({'success': False, 'messages': messages}), 500

##explore
@app.route('/explore/start', methods=['GET'])
def explore_start():
    """Start exploration - show companions"""
    player_id = request.args.get('player_id')

    try:
        db = get_db()
        player = Player.from_db(db, int(player_id))
        unplaced = player.get_unplaced_creatures(db)

        messages = []

        # unplaced creatures
        if unplaced:
            messages.append("")
            messages.append(
                "⚠️  You have unplaced creatures! Place all creatures in habitats before exploring.")
            messages.append(f"📦 {len(unplaced)} creature(s) need placement.")
            messages.append("")
            return jsonify({'success': False, 'messages': messages, 'error': 'unplaced'})

        if not player.are_all_happy(db):
            messages.append("")
            messages.append(
                "⚠️  Some creatures are unhappy! You must fix happiness before exploring.")
            messages.append(
                "Rearrange creatures in habitats or release unhappy ones.")
            messages.append("")
            return jsonify({'success': False, 'messages': messages, 'error': 'unhappy'})

        # companions
        habitats = player.get_habitats(db)
        all_creatures = []
        for habitat in habitats:
            all_creatures.extend(habitat.creatures)

        if not all_creatures:
            messages.append("")
            messages.append("❌ You have no creatures to take as companions!")
            messages.append("")
            return jsonify({'success': False, 'messages': messages, 'error': 'no_creatures'})

        messages.append("")
        messages.append("🎒 Choose a companion for exploration:")
        for i, pc in enumerate(all_creatures, 1):
            messages.append(
                f"  [{i}] {pc.nickname} ({pc.creature.type.name}) - Happiness: {pc.happiness}%")
        messages.append("")
        messages.append("Select companion (number):")

        companions_data = [{'id': pc.id, 'nickname': pc.nickname,
                           'type': pc.creature.type.name} for pc in all_creatures]

        return jsonify({
            'success': True,
            'messages': messages,
            'companions': companions_data
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/explore/encounter', methods=['POST'])
def explore_encounter():
    """Encounter wild creatures"""
    data = request.json
    player_id = data.get('player_id')
    companion_id = data.get('companion_id')

    if not player_id or not companion_id:
        return jsonify({'error': 'Player ID and companion ID required'}), 400

    try:
        db = get_db()
        player = Player.from_db(db, int(player_id))
        companion = PlayerCreature.from_db(db, int(companion_id))

        messages = []
        messages.append("")
        messages.append(f"🌿 {companion.nickname} joins you for exploration!")
        messages.append("")

        # Check if all discovered
        all_species = Creature.get_all(db)
        discovered = player.get_discovered_species(db)

        if len(discovered) >= 16:
            messages.append(
                "🎊 ═══════════════════════════════════════════════════ 🎊")
            messages.append("   🌟 CONGRATULATIONS! YOU'VE CAUGHT THEM ALL! 🌟")
            messages.append(
                "🎊 ═══════════════════════════════════════════════════ 🎊")
            messages.append("")
            messages.append("   You've discovered all 16 creature species!")
            messages.append("   Your sanctuary is complete!")
            messages.append("")
            return jsonify({'success': True, 'messages': messages, 'complete': True})

        # undiscovered creatures
        undiscovered = [c for c in all_species if c.id not in discovered]
        num_to_show = min(3, len(undiscovered))
        wild_choices = random.sample(undiscovered, num_to_show)

        if num_to_show == 1:
            messages.append("🔍 You encounter a wild creature:")
        else:
            messages.append(f"🔍 You encounter {num_to_show} wild creatures:")

        wild_data = []
        for i, wild in enumerate(wild_choices, 1):
            effectiveness = companion.creature.type.get_effectiveness(
                db, wild.type.id)
            status = "✅ Strong" if effectiveness >= 2.0 else "🟡 Normal" if effectiveness >= 1.0 else "❌ Weak"
            messages.append(
                f"  [{i}] {wild.name} ({wild.type.name}) - {status} attraction - ✨ NEW!")
            messages.append(f"      {wild.description}")

            wild_data.append({
                'id': wild.id,
                'name': wild.name,
                'type': wild.type.name,
                'description': wild.description,
                'effectiveness': effectiveness,
                'status': status
            })

        messages.append("")
        choice_range = f"1-{num_to_show}" if num_to_show > 1 else "1"
        messages.append(
            f"Which creature to approach? ({choice_range} or 0 to leave):")

        return jsonify({
            'success': True,
            'messages': messages,
            'wild_creatures': wild_data,
            'companion_id': companion.id
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/explore/catch', methods=['POST'])
def explore_catch():
    """Attempt to catch a creature"""
    data = request.json
    player_id = data.get('player_id')
    wild_creature_id = data.get('wild_creature_id')
    effectiveness = data.get('effectiveness', 1.0)

    if not player_id or not wild_creature_id:
        return jsonify({'error': 'error'}), 400

    try:
        db = get_db()
        player = Player.from_db(db, int(player_id))
        target = Creature.from_db(db, int(wild_creature_id))
        base_chance = 0.3
        modified_chance = min(0.95, base_chance * effectiveness)

        messages = []
        messages.append("")
        messages.append(f"🎯 Attempting to attract {target.name}...")
        messages.append(f"   Base chance: 30%")
        messages.append(f"   Type multiplier: {effectiveness}x")
        messages.append(f"   Final chance: {int(modified_chance * 100)}%")
        messages.append("")

        success = random.random() < modified_chance

        if success:
            messages.append(
                f"🎉 Success! {target.name} trusts you and joins your sanctuary!")
            messages.append("")
            player.catch_creature(db, target)
            messages.append(
                f"✨ {target.name} has been added to your unplaced creatures.")
            messages.append("")
        else:
            messages.append(
                f"😞 {target.name} was not convinced and fled. Better luck next time!")
            messages.append("")

        return jsonify({
            'success': True,
            'messages': messages,
            'caught': success,
            'creature_id': target.id
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/habitats', methods=['GET'])
def view_habitats():
    """View habitats"""
    player_id = request.args.get('player_id')

    if not player_id:
        return jsonify({'error': 'Player ID required'}), 400

    try:
        db = get_db()
        player = Player.from_db(db, int(player_id))
        habitats = player.get_habitats(db)
        unplaced = player.get_unplaced_creatures(db)

        messages = []
        messages.append("")
        messages.append("🏠 === SANCTUARY HABITATS ===")
        messages.append("")

        habitat_data = []
        for habitat in habitats:
            messages.append(
                f"Habitat {habitat.number} ({len(habitat.creatures)}/{Habitat.MAX_SLOTS} creatures):")
            creatures_list = []
            if habitat.creatures:
                for i, cre in enumerate(habitat.creatures, 1):
                    emoji = "😊" if cre.happiness >= 70 else "😐" if cre.happiness >= 30 else "😢"
                    messages.append(
                        f"  [{i}] {emoji} {cre.nickname} ({cre.creature.type.name}) - {cre.happiness}% happy")
                    creatures_list.append({
                        'id': cre.id,
                        'nickname': cre.nickname,
                        'type': cre.creature.type.name,
                        'happiness': cre.happiness
                    })
            else:
                messages.append("  (empty)")
            messages.append("")

            habitat_data.append({
                'id': habitat.id,
                'number': habitat.number,
                'creatures': creatures_list,
                'is_full': habitat.is_full()
            })

        messages.append(f"📦 Unplaced Creatures ({len(unplaced)}):")
        unplaced_data = []
        if unplaced:
            for i, pc in enumerate(unplaced, 1):
                messages.append(
                    f"  [{i}] {pc.nickname} ({pc.creature.type.name})")
                unplaced_data.append({
                    'id': pc.id,
                    'nickname': pc.nickname,
                    'type': pc.creature.type.name
                })
        else:
            messages.append("  (none)")
        messages.append("")

        return jsonify({
            'success': True,
            'messages': messages,
            'habitats': habitat_data,
            'unplaced': unplaced_data
        })

    except Exception as e:
        return jsonify({'error': 'error'}), 500


@app.route('/journal', methods=['GET'])
def view_journal():
    """View field journal"""
    player_id = request.args.get('player_id')

    if not player_id:
        return jsonify({'error': 'Player ID required'}), 400

    try:
        db = get_db()
        player = Player.from_db(db, int(player_id))
        discovered = player.get_discovered_species(db)
        all_species = Creature.get_all(db)

        creatures_data = []
        for creature in all_species:
            is_discovered = creature.id in discovered
            creatures_data.append({
                'id': creature.id,
                'name': creature.name if is_discovered else "???",
                'type': creature.type.name if is_discovered else "???",
                'description': creature.description if is_discovered else "Not yet discovered",
                'image': creature.image_path if is_discovered else None,
                'discovered': is_discovered
            })

        return jsonify({
            'success': True,
            'creatures': creatures_data,
            'discovered_count': len(discovered),
            'total_species': len(all_species)
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/move', methods=['POST'])
def move_creature():
    """Move a creature between habitats"""
    data = request.json
    player_id = data.get('player_id')
    creature_id = data.get('creature_id')
    target_habitat_id = data.get('target_habitat_id')

    if not player_id or not creature_id:
        return jsonify({'error': 'error'}), 400

    try:
        db = get_db()
        player = Player.from_db(db, int(player_id))
        creature = PlayerCreature.from_db(db, creature_id)

        if not creature or creature.player_id != player.id:
            return jsonify({'error': 'Invalid creature'}), 400

        messages = []

        if target_habitat_id is None:
            # Move to unplaced
            db.execute_commit(
                "UPDATE player_creatures SET habitat_id = NULL, habitat_slot = NULL WHERE id = %s",
                (creature_id,)
            )
            messages.append("")
            messages.append(
                f"✅ Moved {creature.nickname} to unplaced creatures")
            messages.append("")
            return jsonify({'success': True, 'messages': messages})
        else:
            # Move to habitat
            habitats = player.get_habitats(db)
            target_habitat = None
            for h in habitats:
                if h.id == target_habitat_id:
                    target_habitat = h
                    break

            if not target_habitat:
                return jsonify({'error': 'Invalid habitat'}), 400

            if target_habitat.is_full():
                messages.append("")
                messages.append(f"❌ Habitat {target_habitat.number} is full!")
                messages.append("")
                return jsonify({'success': False, 'messages': messages})

            new_slot = len(target_habitat.creatures) + 1
            db.execute_commit(
                "UPDATE player_creatures SET habitat_id = %s, habitat_slot = %s WHERE id = %s",
                (target_habitat_id, new_slot, creature_id)
            )

            target_habitat.creatures.append(creature)
            target_habitat.update_happiness(db)

            messages.append("")
            messages.append(
                f"✅ Moved {creature.nickname} to Habitat {target_habitat.number}")
            messages.append(
                f"Updated happiness for Habitat {target_habitat.number}")
            messages.append("")

            return jsonify({'success': True, 'messages': messages})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=8080)
