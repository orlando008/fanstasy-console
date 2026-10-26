# The Franchise's base league: the 30 teams and the 450 players of year 0, and the name tables, as the cart's ROM.
#   python3 carts/src/franchise/league.py carts/src/franchise
# Writes rom/league.bin and rom/names.bin (docs/carts/franchise.md, section 13). A fixed seed: the same bytes every run.
#
# league.bin: 8 bytes of header ('FRLG', version, teams, slots, 0), 30 teams of 8 bytes (city, nickname, colour 1, colour 2,
# emblem, seats in hundreds, talent, market), then 30 x 15 persons of 15 bytes: first name (2) and last name (2), both little endian,
# height in inches, age, the six PEAK ratings (INS OUT PLY DEF REB ATH), peak age, salary in $0.25M, years left.
# A person's row number is team * 15 + slot, and his position is slot % 5 (PG SG SF PF C).
# names.bin: first names, last names, cities, nicknames: each a list of lines, the lists parted by a line of '#'.
import os, random, sys

NT, SL = 30, 15
POS = ['PG', 'SG', 'SF', 'PF', 'C']
BIAS = [(-8, 2, 10, 0, -12, 2), (-4, 8, 3, 0, -8, 2), (0, 3, -2, 2, -2, 3), (6, -4, -6, 2, 6, 0), (10, -12, -10, 4, 12, -4)]   # INS OUT PLY DEF REB ATH by position
WEIGHT = [(1, 2, 3, 1, 1, 2), (1, 3, 2, 1, 1, 2), (2, 2, 1, 2, 1, 2), (3, 1, 1, 2, 2, 1), (3, 0, 1, 2, 3, 1)]                        # the overall: weights of the six ratings, 10 in all
GROW = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 19]                                                                                          # what a player lacks d years before his peak
DECL = [0, 1, 2, 4, 6, 9, 13, 18, 24, 31, 39, 48]                                                                                        # and what he has lost d years after it
GR = (10, 10, 10, 10, 10, 8)
DR = (8, 6, 7, 10, 10, 16)

TEAMS = [('Boston', 'Harbors'), ('Brooklyn', 'Bridges'), ('Philadelphia', 'Founders'), ('Toronto', 'Northmen'), ('Montreal', 'Voyageurs'),
         ('Washington', 'Monuments'), ('Charlotte', 'Queens'), ('Atlanta', 'Peaches'), ('Miami', 'Tides'), ('Orlando', 'Comets'),
         ('Detroit', 'Gears'), ('Cleveland', 'Foundries'), ('Indianapolis', 'Circuits'), ('Milwaukee', 'Foxes'), ('Chicago', 'Gales'),
         ('Los Angeles', 'Surf'), ('San Francisco', 'Fog'), ('Seattle', 'Rain'), ('Portland', 'Pines'), ('Denver', 'Peaks'),
         ('Phoenix', 'Scorchers'), ('Dallas', 'Wranglers'), ('Houston', 'Gushers'), ('San Antonio', 'Missions'), ('Memphis', 'Blues'),
         ('New Orleans', 'Bayou'), ('Oklahoma City', 'Twisters'), ('Minneapolis', 'Frost'), ('Salt Lake', 'Summit'), ('Las Vegas', 'Neon')]

FIRST = """Aaron Abel Adam Adrian Alan Albert Alex Alexis Alfred Allen Andre Andrew Andy Angel Anton Antonio Archie Arlo Armando Arthur Ash Austin
Avery Barry Beau Ben Benito Bennett Bernard Bill Billy Blake Bo Bobby Boris Brad Brandon Brent Brett Brian Brock Bruce Bryce Byron Caleb Calvin
Cameron Carl Carlos Carson Casey Cecil Cedric Chad Charles Charlie Chase Chester Chris Clarence Clark Claude Clay Clayton Cliff Clifton Clint
Cody Colby Cole Colin Connor Cooper Corey Craig Curtis Dale Damon Dan Daniel Danny Darius Darnell Darren Darryl Dave David Dean Dennis Derek
Desmond Devin Dexter Diego Dion Dominic Don Donald Doug Douglas Drake Drew Duane Dustin Dwayne Earl Eddie Edgar Eduardo Edward Edwin Eli
Elijah Elliot Elmer Emanuel Emil Emmett Eric Ernest Ethan Eugene Evan Everett Ezra Felix Fernando Floyd Francis Frank Franklin Fred Freddie
Gabe Gary Gavin Gene Geoff Gerald Gilbert Glen Gordon Grady Graham Grant Greg Gus Guy Hakeem Hal Hank Harold Harry Harvey Hayden Hector Henry
Herbert Herman Howard Hugh Hugo Ian Isaac Isaiah Ivan Jack Jackson Jacob Jake Jalen Jamal Jared Jason Jasper Javier Jay Jayden Jeff Jeremy
Jerome Jerry Jesse Jim Jimmy Joe Joel Johnny Jon Jonah Jonas Jonathan Jose Joseph Josh Joshua Juan Julian Julius Justin Karl Keith Kelvin
Ken Kenneth Kent Kevin Kirk Kobe Kurt Kyle Lamar Lance Larry Lawrence Lee Leo Leon Leonard Leroy Leslie Levi Lewis Liam Lionel Lloyd Logan
Lonnie Louis Lucas Luis Luke Luther Malcolm Manny Marc Marcus Mario Mark Marlon Marshall Martin Marvin Mason Matt Maurice Max Melvin Micah
Miguel Mike Miles Milton Mitch Monte Morgan Moses Murray Nate Nathan Neil Nelson Nick Noah Noel Norman Oliver Omar Orlando Oscar Otis Owen
Pablo Pat Patrick Paulo Pedro Percy Perry Pete Peter Phil Phillip Preston Quentin Quincy Rafael Ralph Ramon Randy Raul Ray Raymond Reggie
Rex Ricardo Richard Rick Ricky Rob Robert Rod Rodney Roger Roland Ron Ronnie Roscoe Ross Roy Ruben Rudy Russ Russell Ryan Sam Samuel Santiago
Saul Scott Sean Sergio Seth Shane Shawn Sidney Simon Stan Stanley Stephen Steve Stuart Sylvester Ted Terrance Terry Theo Thomas Tim Timothy
Toby Todd Tom Tommy Tony Trent Trevor Troy Tyler Tyrone Ulysses Vance Vernon Victor Vince Vincent Wade Wallace Walter Warren Wayne Wesley
Will Willie Winston Wyatt Xavier Zach Zane""".split()

LAST = """Abbott Acosta Adair Aguilar Ahmed Akers Albright Alder Alford Allard Alvarado Amos Anders Archer Arden Armstrong Arnold Ashby Ashford Atkins
Atwood Austen Avila Ayers Bagley Bailey Baird Baker Baldwin Ballard Banks Barber Barclay Barker Barlow Barnes Barnett Barrett Barron Barton Bassett
Bates Baxter Beal Beard Beasley Beck Bell Bellamy Benson Bentley Berger Bernard Berry Best Bickford Biggs Bishop Black Blackwell Blair Blake
Blanchard Bledsoe Bolton Bond Booker Boone Booth Boyd Boyle Bradford Bradley Brady Branch Brandt Bray Brennan Brewer Bridges Briggs Briscoe
Brock Brooks Brown Bruce Bryan Buchanan Buck Buckley Burch Burgess Burke Burnett Burns Burris Burton Bush Butler Byers Byrd Cabrera Cagle Cahill
Caldwell Calhoun Callahan Camacho Cameron Campbell Cannon Cantrell Carey Carlisle Carlson Carmichael Carney Carpenter Carr Carrillo Carroll
Carson Carter Cassidy Castillo Castro Chambers Chandler Chaney Chapman Chase Chavez Christian Clancy Clarke Clay Clayton Clemons Cobb Coburn
Cochran Coffey Cohen Colby Coleman Collier Collins Colon Combs Compton Conley Conner Conrad Contreras Cook Cooley Cooper Copeland Corbett
Cordova Cortez Costa Cotton Cowan Cox Crabtree Craig Crane Crawford Crider Crockett Cross Crowley Cruz Cummings Cunningham Dalton Daly Dane
Daniels Darby Dawson Day Dean Decker Delaney Dennis Dickson Dillon Dixon Dobbs Dodson Donahue Donovan Dorsey Dougherty Douglas Doyle Drake
Dudley Duffy Duke Dunbar Dunn Durham Dwyer Dyer Eaton Edmonds Edwards Elder Eliott Ellis Emerson Emery English Epps Erwin Estes Evans Everett
Fairchild Farley Farmer Farrell Faulkner Felton Ferguson Fernandez Field Finch Finley Fischer Fisher Fitch Fitzgerald Fleming Fletcher Flores
Floyd Flynn Foley Forbes Ford Foreman Forster Foster Fowler Fox Francis Franco Frank Franklin Frazier Freeman French Frost Fuller Fulton Gaines
Gallagher Galloway Garcia Gardner Garner Garrett Garrison Gates Gentry Gibbs Gibson Gilbert Giles Gill Gillespie Glass Glenn Glover Goddard
Goff Gomez Gonzalez Goodman Goodwin Gordon Grady Graham Grant Graves Gray Green Greene Greer Gregory Griffin Grimes Gross Guerrero Gunn
Gutierrez Guy Haas Hackett Hagen Hale Hall Hamilton Hammond Hampton Hancock Hanna Hansen Hardin Hardy Hargrove Harlan Harmon Harper Harrell
Harris Harrison Hart Hartley Harvey Hastings Hatfield Hawkins Hayes Haynes Heath Henderson Hendrix Henry Hensley Herrera Hess Hickman Hicks
Higgins Hill Hines Hinton Hobbs Hodge Hoffman Hogan Holcomb Holden Holland Hollis Holloway Holmes Holt Hood Hooper Hopkins Horn Horton House
Houston Howard Howe Hubbard Huber Hudson Huff Huffman Hughes Hull Humphrey Hunt Hunter Hurley Hutchinson Hyde Ingram Irwin Ives Jacobs Jarvis
Jenkins Jennings Jensen Jessup Jimenez Joiner Jolly Jones Joyce Kane Kaplan Keane Keller Kelley Kelly Kemp Kendall Kennedy Kent Kerr Kidd
Kim King Kinney Kirby Kirk Klein Knight Knox Koch Kramer Lacey Lamb Lambert Lancaster Landry Lane Lang Langley Lara Larkin Larson Lawrence
Lawson Leach Leblanc Lester Levine Lewis Lindsey Little Livingston Lloyd Locke Logan Long Lopez Love Lowe Lucas Lundy Lynch Lyons Mack
Madden Maddox Maguire Mahoney Malone Mann Manning Marks Marsh Marshall Martel Mason Massey Mathis Maxwell Mayer McBride McCall McCoy
McDaniel McGee McKay McKinney McLean Meadows Mercer Merritt Meyer Michaels Miles Miller Mills Mitchell Monroe Montgomery Moody Moon Moore
Morales Moran Moreno Morgan Morris Morrison Morrow Morse Morton Moss Mueller Mullins Munoz Murphy Murray Myers Nash Navarro Neal Nelson
Newman Newton Nichols Nixon Noble Nolan Norman Norris North Norton Nunez Oakley Obrien Ochoa Oliver Olsen Ortega Osborne Owens Pace Padilla
Page Palmer Park Parker Parks Parrish Patrick Patterson Payne Peck Pena Pennington Perez Perkins Perry Peters Peterson Petty Phelps Phillips
Pierce Pittman Pollard Poole Pope Porter Potter Powell Powers Pratt Preston Price Pruitt Pugh Quinn Ramirez Ramsey Randall Rankin Ray Raymond
Reed Reese Reeves Reid Reilly Reyes Reynolds Rhodes Rice Rich Richards Richardson Riddle Riggs Riley Rios Rivera Roach Robbins Roberts
Robertson Robinson Rocha Rodgers Rodriguez Rogers Rollins Romero Rosales Rose Ross Rowe Rowland Roy Rush Russell Ryan Salas Salazar Sampson
Sanchez Sanders Sandoval Santana Santiago Sargent Saunders Savage Sawyer Sayers Schaefer Schmidt Schneider Schroeder Schultz Schwartz Scott
Sears Sexton Shaffer Shannon Sharp Shaw Shelton Shepherd Sheppard Sherman Shields Short Sidney Silva Simmons Simon Simpson Sinclair Singleton
Skinner Slater Sloan Snow Solomon Soto Spears Spence Spencer Stafford Stanley Stark Steele Stephens Sterling Stevenson Stewart Stokes Stone
Strickland Strong Stuart Sullivan Summers Sutton Swanson Sweeney Tanner Tate Tatum Taylor Terrell Thacker Thomas Thompson Thornton Todd
Torres Tower Townsend Tracy Trevino Trujillo Tucker Turner Tyler Underwood Valdez Vance Vargo Vasquez Vaughn Vega Velez Wade Wagner Walker
Wall Wallace Walsh Walters Ward Warner Warren Watkins Watson Watts Weaver Webb Weber Webster Weeks Wells West Wheeler Whitaker White Whitley
Wiggins Wilcox Wilder Wiley Wilkins Willis Wilson Winters Wise Wolfe Wong Wood Woodard Woods Wright Wyatt Yates York Young Zamora Zimmerman""".split()


def rng_pick(r, lo, hi): return r.randint(lo, hi)


def clamp(v, lo, hi): return max(lo, min(hi, v))


def overall(pos, R):
    return round(sum(w * x for w, x in zip(WEIGHT[pos], R)) / 10)


def rating_at(R, i, age, peak):
    """The i-th rating at an age (the cart's curve: JS has the same tables)."""
    if age < peak: v = R[i] - (GROW[min(10, peak - age)] * GR[i]) // 10
    else: v = R[i] - (DECL[min(11, age - peak)] * DR[i]) // 10
    return clamp(v, 20, 99)


def salary_for(o):
    """Salary in $0.25M units for a current overall o (a market curve: $1.5M at 45, $5M at 60, $15M at 70, $30M at 80, $45M at 90)."""
    pts = [(40, 6), (45, 6), (55, 12), (60, 20), (65, 36), (70, 60), (75, 88), (80, 120), (85, 152), (90, 180), (99, 200)]
    for (a, x), (b, y) in zip(pts, pts[1:]):
        if o <= b: return x + (y - x) * (o - a) // (b - a)
    return 200


def make(seed=2026):
    r = random.Random(seed)
    talent = [clamp(int(r.gauss(50, 11)), 30, 72) for _ in range(NT)]
    persons = []
    used = set()
    stars = sorted(r.sample(range(NT), 14))                                    # fourteen teams have a star of 85 and over
    for t in range(NT):
        for s in range(SL):
            pos, tier = s % 5, s // 5
            mean = (70, 61, 56)[tier] + int((talent[t] - 50) * 2 / 5)
            sd = (7, 6, 5)[tier]
            peak_o = clamp(int(r.gauss(mean, sd)), 38, 96)
            if tier == 0 and s == 0 and t in stars: peak_o = clamp(peak_o + 14, 80, 95)
            age = clamp(int(r.gauss((27, 25, 23)[tier], 3.5)), 19, 36)
            peak = clamp(age + r.randint(-2, 3) if age >= 26 else r.randint(24, 28), 24, 30)
            if age < 23: peak = r.randint(25, 28)
            R = [clamp(peak_o + BIAS[pos][i] + r.randint(-6, 6), 25, 99) for i in range(6)]
            for _ in range(12):                                                    # tune the peak overall to the target
                d = peak_o - overall(pos, R)
                if d == 0: break
                R = [clamp(x + (1 if d > 0 else -1), 25, 99) for x in R]
            cur = overall(pos, [rating_at(R, i, age, peak) for i in range(6)])
            sal = clamp(salary_for(cur) * r.randint(85, 118) // 100, 6, 200)
            yrs = r.randint(1, 5) if age > 22 else r.randint(1, 4)
            while True:
                fn, ln = r.randrange(len(FIRST)), r.randrange(len(LAST))
                if (fn, ln) not in used: used.add((fn, ln)); break
            ht = clamp(int(r.gauss((73, 76, 79, 81, 84)[pos], 1.6)), 68, 90)
            persons.append(dict(t=t, s=s, pos=pos, fn=fn, ln=ln, ht=ht, age=age, R=R, peak=peak, sal=sal, yrs=yrs, cur=cur))
    # payrolls: scale each team's salaries into a plausible band (a few over the tax line, a few near the floor)
    for t in range(NT):
        P = persons[t * SL:(t + 1) * SL]
        tot = sum(p['sal'] for p in P) / 4
        want = clamp(r.gauss(112, 14), 84, 150)
        k = want / tot
        for p in P: p['sal'] = clamp(round(p['sal'] * k), 6, 170)
    return talent, persons


def build(outdir, seed=2026):
    talent, persons = make(seed)
    r = random.Random(seed + 1)
    teams = bytearray()
    for t, (c, n) in enumerate(TEAMS):
        c1, c2 = r.randrange(16), r.randrange(16)
        while c2 == c1: c2 = r.randrange(16)
        teams += bytes([t, t, c1, c2, r.randrange(8), r.randint(150, 205), talent[t], r.randint(20, 90)])
    rows = bytearray()
    for p in persons:
        rows += p['fn'].to_bytes(2, 'little') + p['ln'].to_bytes(2, 'little') + bytes([p['ht'], p['age']] + p['R'] + [p['peak'], p['sal'], p['yrs']])
    head = b'FRLG' + bytes([1, NT, SL, 0])
    league = head + bytes(teams) + bytes(rows)
    names = '\n'.join(FIRST) + '\n#\n' + '\n'.join(LAST) + '\n#\n' + '\n'.join(c for c, n in TEAMS) + '\n#\n' + '\n'.join(n for c, n in TEAMS)
    os.makedirs(os.path.join(outdir, 'rom'), exist_ok=True)
    open(os.path.join(outdir, 'rom', 'league.bin'), 'wb').write(league)
    open(os.path.join(outdir, 'rom', 'names.bin'), 'wb').write(names.encode('ascii'))
    return talent, persons, league, names


def report(talent, persons):
    pay = [sum(p['sal'] for p in persons[t * SL:(t + 1) * SL]) / 4 for t in range(NT)]
    ovr = [[p['cur'] for p in persons[t * SL:(t + 1) * SL]] for t in range(NT)]
    top8 = [sum(sorted(o, reverse=True)[:8]) / 8 for o in ovr]
    ages = [p['age'] for p in persons]
    allo = sorted(p['cur'] for p in persons)
    print('payrolls $M: min %.0f, mean %.0f, max %.0f' % (min(pay), sum(pay) / NT, max(pay)))
    print('team strength (top 8 overall): min %.1f, mean %.1f, max %.1f' % (min(top8), sum(top8) / NT, max(top8)))
    print('ages: min %d, mean %.1f, max %d; players 80+: %d, 70+: %d, median %d, lowest %d' % (min(ages), sum(ages) / len(ages), max(ages), sum(1 for x in allo if x >= 80), sum(1 for x in allo if x >= 70), allo[len(allo) // 2], allo[0]))


if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else '.'
    talent, persons, league, names = build(out)
    assert len(FIRST) <= 1024 and len(LAST) <= 1024 and len(set(FIRST)) == len(FIRST) and len(set(LAST)) == len(LAST), 'the name tables'
    assert len(league) == 8 + NT * 8 + NT * SL * 15, len(league)
    report(talent, persons)
    print('rom/league.bin %d bytes, rom/names.bin %d bytes (%d first names, %d last names)' % (len(league), len(names), len(FIRST), len(LAST)))
