# Virtual Queue System
Implement the outlined queue system to the current app.

## System Settings
- LineCount = 2: number of parallel lines in the queue

## Sign-Up Kiosk Frontend
- **Default View:** "Join Queue" button with current wait time in minutes
- **Join Queue View:** Users enter a name and phone number to join the queue. Additionally, the user may select how many slots ("party size") at a time they are reserving in range of [1, MAX=LineCount=2]. This enables friends and parties to experience together.
- **Confirmation View:** User's place in line, time until their turn in minutes, and their arrival time.

## Admin Frontend
- **Queue Display**: Shows listed info of users in the queue, remove button for each entry.
- **Next Slot Button:** Move queue to the next slot. Moves current slot to the archive (log) list and moves next users to current slot.

# Existing Frontend: Post-Experience Kiosk
- Allows users to request files to be sent to their email

## Backend
- Receives signups from Kiosk with party size
- Handles queue in a "best fit" mode where signups are fit in to the first available space that will fit the signup size (number of people in the party)
```
[ --  current slot   -- ]
[ user a   ] [ empty    ]
[ group b1 ] [ group b2 ]

> user b signs up and is fit into the empty space:
[ --  current slot   -- ]
[ user a   ] [ user b   ]
[ group b1 ] [ group b2 ]
```
- Optimizes the queue when sign-ups are cancelled
- Text users when they sign up and when they are next up
- Allow cancellation if user responds to text with `CANCEL`