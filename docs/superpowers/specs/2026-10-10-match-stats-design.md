# Match Stats: design

Oct 10, 2026 · Connor

## What this is and why

Match Stats is a phone app that shows a kids grassroots football coach, live, how long every player has been on the pitch, so game time can be shared out fairly.

Fair minutes come first. Goals, assists and season totals sit on top of that and must never get in the way of it.

The idea is a rolling timer per player. The coach taps start at kick off and every starter's clock runs. A player on the bench stays at 00:00 until they come on. When a sub is made, the clock of the player coming off stops and the clock of the player going on starts.

It starts with Connor's own team and is meant for other teams to pick up and use as well.

## Goals, non-goals and anti-goals

**Goals**

- A play-time clock for every player that starts and stops with subs.
- Goals and assists logged against players, with the match time.
- A full-time summary of minutes, goals and assists per player.
- Season totals per player for play time, goals and assists.
- Works fully offline, with all data stored on the phone it is used on.
- Other teams can pick it up and use it, and one phone can look after several teams.
- A settings page to add players and choose the format: 3, 5, 7, 9 or 11 a side.

**Non-goals for the first version**

- No accounts, sign in or cloud storage.
- No sharing a live match between two phones. One phone does all the tapping.
- No fixtures, league tables, messaging, cards or other stats. Nothing beyond minutes, subs, goals and assists was asked for.

**Anti-goals: it has failed if any of these happen**

- A clock resets or stops counting because the phone locked or the app was closed.
- Something logged by mistake cannot be corrected.
- A match can start with fewer players than the format needs. A short team would not be allowed to play, so the app never allows it either.

## Who uses it and when

A coach and an assistant coach at a kids grassroots match use it on one phone, on the touchline, usually with no signal worth relying on.

One of them watches the game while the other taps. Matches are small sided with rolling subs, so the same child can come off and go back on several times.

The phone is in a hand or a pocket, outdoors, often in the cold and wet. Buttons need to be big, and the common jobs (a sub, a goal) need to take very few taps.

## Screens and flow

There are eight screens, and all eight are drawn in separate mockups (static pictures with made-up names and numbers).

[Diagram: Settings -> Pick the team -> (start match) -> Live match -> (end match) -> Full time -> Season totals. During the match, Live match opens Make a sub, Log a goal and Match log; each one confirms, then returns to the live match.]

A match runs left to right. Subs, goals and corrections all start from the live match screen and come straight back to it. If the mockups and the written rules disagree, the written rules win. On the live match screen the player lists scroll when a squad is too big to fit, as with 9 or 11 a side. (Claude's call)

Mockups: https://claude.ai/artifact/4BUmYTCQHS2jr8gGRfQnC9 (eight phone screens, 390 x 844). Their look in words: off-white ground #F4F5F2, near-black ink #14181A used for the header band and number chips, pitch green #0B6B3A for running clocks and the main confirm buttons, grey #5A6165 for secondary text, Barlow for text and Barlow Condensed for clocks and numbers. Players are shown as cards in a two-column grid (shirt-number chip, name, clock). On-pitch cards are white with a green clock; bench cards are outlined with a grey clock. Two large buttons, Sub and Goal, sit at the bottom of the live screen.

| No | Screen | What it does |
| --- | --- | --- |
| 1 | Settings | Pick or add a team, name it, choose the format, manage the squad |
| 2 | Pick the team | Set each player to start, bench or not here, name the opposition, start the match |
| 3 | Live match | Score, match clock, every player's play-time clock, Sub and Goal buttons, half time, the last entry with Undo |
| 4 | Make a sub | Pick who comes off, pick who comes on, confirm |
| 5 | Log a goal | Your team or opposition, scorer, assist, confirm |
| 6 | Match log | Everything logged, newest first. Tap an entry to change or delete it |
| 7 | Full time | Final score, and each player's minutes, goals and assists |
| 8 | Season totals | Per player: matches, total minutes, average per match, goals, assists |

## Rules the app must follow

Every rule here is Connor's unless it is marked as Claude's call.

**Starting a match**

- The Pick the team screen lists the selected team's squad. Each player is set to start, bench or not here.
- Start match stays locked until the number of starters equals the format: 7 for 7 a side, 5 for 5 a side.
- A player marked not here is left out of the match entirely. The players picked are then fixed for that match: nobody is added after kick off, and a player only comes off when a replacement goes on.
- The other team's name can be typed in and shows on the score and in saved matches. (Claude's call)

**Clocks**

- Tapping Start match starts the match clock and every starter's play-time clock together. Bench players sit at 00:00.
- A player's clock runs only while they are on the pitch and the match is in play.
- A match is two halves. The match clock counts up until the coach taps half time, then again until they tap full time, and the app holds no match length. Half time freezes every clock. In the second half each clock carries on from where it stopped. Nothing resets.
- A player who comes off and goes back on later carries on from their earlier total.
- Clocks must stay correct when the phone locks, the screen turns off, another app is opened or the app is closed and reopened.
- To make that true, the app saves the moment each clock started and works the time out from the phone's own clock. It never relies on a counter ticking on screen. (Claude's call)
- Every tap is saved straight away, so reopening the app returns to the same match in the same state. (Claude's call)

**Subs**

- A sub is three steps: pick the player coming off, pick the player coming on, then confirm.
- On confirm, the clock of the player coming off stops and the clock of the player coming on starts.
- Clocks keep running while the coach is choosing. The switch happens at the moment of confirm. (Claude's call)
- The bench is listed with the least-played player first, so whoever is due a turn is at the top. (Claude's call)
- The number of players on the pitch always equals the format.

**Goals and assists**

- Tapping Goal saves the match time at that moment, so choosing players afterwards does not shift the minute. (Claude's call)
- A switch chooses Your team or Opposition. An opposition goal only changes the score. (Claude's call)
- For your team: pick the scorer from the players on the pitch, then pick an assist from the same players or choose no assist. The scorer cannot assist their own goal. (Claude's call)
- An own goal button covers the other team putting it in their own net: it counts for your team with no scorer. (Claude's call)

**Correcting mistakes**

- Anything logged can be corrected.
- The live screen shows the last thing logged with an Undo beside it. (Claude's call)
- A match log lists everything logged (kick off, subs, goals), newest first. Tapping an entry lets the coach change the players, change the time or delete it. (Claude's call)
- After any change the score, the play-time clocks and the totals are worked out again from the log. (Claude's call)
- The log stays available for saved matches, so a mistake spotted later can still be fixed. (Claude's call)

**Full time**

- Ending the match stops every clock and saves the match.
- The full-time screen shows each player's time on the pitch, goals and assists, with the final score.

**Season totals**

- Each saved match adds to the season totals for that team.
- Per player it shows matches attended, total minutes, average minutes per match, goals and assists.
- The average counts only the matches a player was at. A match they missed does not pull their number down. (Claude's call)
- The list is sorted with the lowest average first, so the player getting the least game time is at the top. (Claude's call)

## Data and offline

The app is totally offline and all data is stored on the phone it is used on. There is no server, no account and no sign in.

**Teams**

- One phone can look after several teams. A drop-down in settings picks the team, with a New team button beside it.
- Each team keeps its own name, format, squad, saved matches and season totals. (Claude's call)
- The app opens on the team used last, so a coach with one team never needs the drop-down. (Claude's call)

**Squad**

- Players are added in settings so they are ready to pick on match day.
- Each player has a shirt number and a name. Tapping a player edits or removes them. (Claude's call)
- Removing a player from the squad keeps their records in matches already saved. (Claude's call)

**Format**

- Each team chooses 3, 5, 7, 9 or 11 a side.
- The format sets how many players are on the pitch at once. Everyone else in the match starts on the bench. (Claude's call)

**Keeping data safe**

- Because the data lives only on the phone, deleting the app or clearing its data would wipe every team and season.
- A backup button saves everything to a file, and a restore button loads it back in, for example on a new phone. (Claude's call)
- A season is closed with a Start new season button in settings. Old seasons stay viewable. (Claude's call)

## How it gets built and released

It is built once as a web app, tested by word of mouth through a link, then wrapped as store apps for Android and iPhone. Connor wants both store builds. The route to them is Claude's call.

1. **Web app for testing.** The app is a small bundle of files on a web host. A coach opens a link once, adds it to their home screen, and from then on it opens like an app and runs with no signal. Fixes reach every tester the next time they open it.
2. **Android store build.** The same app is wrapped as an Android app and published on Google Play.
3. **iPhone store build.** The same app is wrapped as an iPhone app and published on the App Store. Connor has no Mac, and an iPhone build needs one, so this step uses a paid build service or a borrowed Mac.

**What the store steps need**

| Store | Cost | Condition |
| --- | --- | --- |
| Google Play | 25 US dollars, paid once | A new personal account must run a closed test with at least 12 testers opted in for 14 days in a row before going public |
| Apple App Store | 99 US dollars a year, or the local equivalent | Membership of the Apple Developer Program |

The coaches who test the web app by word of mouth can be the 12 Google testers, as long as 12 of them have Android phones.

**Hosting**

The host only hands out the app's files. Squads, matches and totals never leave the phone, so there is no database or server to run. Hosting this small is usually free or very cheap. No host has been chosen or priced yet.

**Technical choices (all Claude's call)**

- An installable offline web app (a PWA), written in TypeScript with React.
- Data kept in the phone's on-device browser storage (IndexedDB).
- A match is stored as a log of timestamped events. Clocks, score and totals are always worked out from that log, which is what makes corrections and lock-proof clocks possible.
- Capacitor wraps the same web app for the two stores, so the store builds reuse what was tested.
- Connor builds on a Windows PC and tests on both an Android phone and an iPhone. The web app must therefore work properly from the home screen on both phones from the first test version, not only at the store stage.

Connor is building this with Claude and has no programming background, so the plan should favour few moving parts and plain setup steps.

## Calls Claude made, for Connor to check

These are the calls most worth a second look. Each one is also marked where it appears above.

- The season average counts only the matches a player was at.
- Season totals and the bench are sorted with the least-played player first.
- Opposition goals are logged with a switch, and there is an own goal button.
- Mistakes are fixed through Undo and a match log, during the match and after it.
- A backup and restore button, because the data lives only on the phone.
- Seasons are closed with a Start new season button.
- Built as a web app first, then wrapped for Google Play and the App Store.
- The iPhone build goes through a paid build service or a borrowed Mac.

## Left to the builder

- The final look, as long as it stays close to the mockups: large buttons, high contrast, readable outdoors.
- The wording of buttons, labels and messages.
- How the change-time and change-players steps in the match log are laid out.
- What the app says when a correction would make the log impossible, such as subbing off a player who was not on the pitch.
- How ending the match is confirmed so it cannot be done by a stray tap.
- Where saved matches are listed and how an old season is viewed.
- The choice of web host, and of the service used for the iPhone build.
- The backup file's format.
- How the app is tested, with the clock rules covered first.
