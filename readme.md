# activity_sprunkruns

Very simple system for "sprunkruns", which is on paper just box deliveries to vending machines. It is basically just like store runs, but in my opinion it can add a little extra RP, by having to go into locations that are a bit harder to reach (i.e. Mission Row break room) or by having to walk into the Pillbox lobby. However this could also be undesirable.

Job available at `{ x = 874.59, y = -1669.39, z = 30.46 }`

## Config options

All config files in `src/common`

- `areas.ts`
  - Very simple definition for every GTA zone with enabled bool.
- `config.ts`
  - `ACTIVITY_NAME` self-explanatory. All events are string formatted
  - `VEHICLE` used vehicle model, pony has a Sprunk livery.
  - `SPAWN_LOCATION` vector3 for where the cars spawn
  - `SPAWN_HEADING` self explanatory
  - `ZONE_INTERVAL` script checks (default 500ms) if the player is in zone or not. Player can not deliver boxes or even get boxes if he is not in the right zone.
  - `BOXES_PER_ZONE` how many boxes need to be delivered in a zone? Set to 1 because it can actually be quite hard.
  - `ZONE_AMOUNT` how many zones are done in a run, set to 2 by default like garbage runs
  - `COMPLETION_TIMES` for the third `activityInProgress`, has placeholder values
- `types.ts`
  - Just ts types

## Entity Models used in this
Added a few more than it should use, just so testing is easier. You guys should have all these mapped already anyways for getting drinks and food.

- 1114264700
- 992069095
- 1262567554
- 1099892058
- -1317235795

## Scripts used

- nns_rpc
  - Sky already has this, probably should be exchanged for yours.
- dpemotes
  - Used for box emote, split in extra ´lib.ts` where I just use simple events, I believe you guys have a special resouree for attachments.

## Events used

- `activity_${ACTIVITY_NAME}:server:requestJob`
  - Entry check if player can do job
- `activity_${ACTIVITY_NAME}:server:triggerZoneChange` C->S RPC
  - triggers to server to update that the player is in the zone
- `activity_${ACTIVITY_NAME}:server:getBox` Peek->C
  - Event triggered for whenever gets box from van
- `activity_${ACTIVITY_NAME}:server:getBox` C->S RPC
  - Serverside checks if player can get box out of car
- `activity_${ACTIVITY_NAME}:server:deliverBox` Peek->S
  - Event triggered whenever peeked at vending machine
- `activity_${ACTIVITY_NAME}:server:deliverBox` C->S RPC
  - Serverside checks if player has box and if all needed checks are filled

## Compile steps
- `npm i`
- `npm run build`
- ez clap
