
# Front Server

## Installation

`npm install`

In the .env file please copy this in

VITE_MAPBOX_TOKEN = You can get your token here https://docs.mapbox.com/help/dive-deeper/access-tokens/

Only add these after sprint 6


VITE_CLERK_FRONTEND_API=

CLERK_SECRET_KEY=

VITE_FIREBASE_API_KEY=AIzaSyACrNGKLuhdljXK3xMOlWqyMJQpWQLGSFc
VITE_FIREBASE_AUTH_DOMAIN=dk9595c-46a8d.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=dk9595c-46a8d
VITE_FIREBASE_STORAGE_BUCKET=dk9595c-46a8d.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=8364790413
VITE_FIREBASE_APP_ID=1:8364790413:web:658c725f6e284e9914c8c4


Task A: Summarize Authentication and Database

Client State: The front end captures the geolocation when a user drops a pin and updates its local state to render the marker on the map.

Network Transmission: The client packages the pin coordinates into an HTTP request and sends it to the back end server's API endpoints.

Server Processing: The back end receives the payload, validates the data, and performs necessary computations like geographic region translation without caching the permanent state locally.

Cloud Persistence: The server communicates with the Firestore API to save the pin data within a user specific collection, ensuring the itinerary remains stored even if the back end server restarts.


## Scripts

| Command                  | Description                                             |
| ------------------------ | ------------------------------------------------------- |
| `npm run dev`            | Start server in development mode using ts-node.         |
| ------------------------ | ------------------------------------------------------- |

For debugging inspect element on the page and go into the sources tab where you will be able to place breakpoints

### Task C: User Experience and Accessibility Auditing
Step 1: User Inyerface
It took me approximately one and a half minutes to navigate the User Inyerface application, during which its intentionally hostile design choices severely hindered my progress. One major issue is the use of misleading button colors, where negative actions like "Cancel" are styled in an inviting green while positive actions are plain text or red, actively preying on user muscle memory. Additionally, the form inputs break standard data entry expectations by splitting fields like email into cumbersome dropdowns and hiding password requirements until a validation failure occurs. Finally, the obfuscated Terms and Conditions modal features a custom-built scrollbar that moves at a fraction of standard speed, frustrating users and creating severe accessibility issues for those with motor impairments.

Step 2 & 3: Auditing with Lighthouse & Manual Checks
Using Chrome's Developer Tools, I ran a Lighthouse audit on the travel planner web application configured for Navigation, Desktop, and Accessibility. While it yielded an accessibility score of 95, the report flagged 10 Additional items to manually check, including verifying logical tab ordering, ensuring focus is not trapped, and confirming visual order matches DOM order.

The 0320 AI agent could parse the static React components but lacked the rendering engine and physical input capabilities to perform these interactive checks. To bridge this gap, I conducted a manual evaluation by physically tabbing through the live application. I verified that the application is fully keyboard accessible: all interactive buttons and inputs successfully receive a clear visual focus outline, the tabbing flow logically follows the visual layout, and the user's focus does not become trapped in any specific region. This confirms that while automated tools and AI can flag potential structural concerns, manual human testing remains essential to validate interactive accessibility.


### Task D: Conforming to a Standard
1. Self Code Review
In our Sprint 3/4 backend, I realized we primarily tested happy paths rather than edge cases. We should have written mock tests to simulate external API timeouts (ACS, FBI, Weather) to ensure the server gracefully handles delays instead of hanging. Additionally, our CSV handler loads entire files into memory; testing massive or malformed datasets would reveal potential memory bottlenecks. Finally, while we did successfully implement an IP-based rate limiter (Task Y), testing it behind a shared NAT/VPN would expose its flaws, highlighting the need for token-based user limits rather than just IP tracking.

2. Sprint Reflection
The biggest paradigm shift was moving from procedural backend routing to React's declarative state management. Instead of simply firing a response, I had to use useState to manage asynchronous UI re-renders when the DataViewer received data. The toughest bug today was a silent port mismatch: the frontend attempted to fetch from 3232 while the Express server was actually listening on 3001. Tracing the failed network requests taught me to always verify environment configurations before assuming the API logic is broken.

3. User Experience Reflection
Reviewing the final UI revealed several styling and accessibility quirks. First, while vertical scrolling works, loading a CSV with 25 columns causes horizontal overflow, either squishing the text or breaking the sidebar boundaries. Second, querying an invalid ACS county leaves the table confusingly blank instead of surfacing a clear No results found error state. Finally, shrinking the browser to a mobile width causes the sidebar and map to overlap improperly, showing that our CSS needs flexible containers and media queries to be genuinely accessible across devices.

### Task Y : High Level Design Reflection
Visiting the primary NPR website and its text alternative reveals two vastly different user experiences. The text version offers a streamlined and highly accessible reading environment that loads instantly. Conversely, the primary site provides a rich multimedia experience featuring high resolution photography, interactive graphics, and embedded audio players. Because the simplified layout entirely omits these rich media elements, visitors lose crucial visual context. For example, a reader misses the sheer devastation shown in photographs of California wildfires or the emotional expressions of crowds during protests. Furthermore, stripping out embedded podcast players prevents visitors from streaming audio directly alongside the news, and removing social media embeds obscures direct access to primary source statements. Ultimately, while the minimal design provides a clean space free of distractions, it sacrifices the deep narrative impact and immediate understanding that integrated photojournalism and interactive multimedia deliver.


### Task Z : UI and UX Issue Mitigation Plan
Issue Identified: Unconditional Asset Downloading on Metered Connections
Many modern web applications download large JavaScript bundles, heavy third party scripts, and massive media files without checking the client network state. This creates a severe usability issue for individuals on pay per byte data plans or slow cellular networks. The application consumes costly data and degrades rendering performance before the visitor can even interact with the primary text.

Engineering Mitigation Plan:
To resolve this bottleneck, I propose a progressive, network aware asset delivery system utilizing native browser APIs and local caching strategies to minimize payload sizes.

1. Network Aware Fetching Logic
The frontend will interrogate the navigator connection API to evaluate the save data boolean and the effective network type. If the visitor has data saving mode enabled or is on a restricted network, the React application will conditionally abort fetch requests for non essential assets like background videos, heavy custom fonts, and analytics trackers.

2. Adaptive Media and Lazy Loading
Instead of serving uniformly large image files, the user interface will implement native HTML picture elements utilizing source set attributes. This allows the browser engine to mathematically select and download the smallest possible WebP format image that fits the current viewport width. All media rendered below the fold will be strictly deferred using native lazy loading, ensuring data is only consumed when a component actually enters the visible screen area.

3. Service Worker Caching and Compression
By registering a Service Worker, we will implement a cache first strategy for the core application shell. The initial visit will securely store the compiled CSS and JavaScript bundles in local memory. Subsequent visits will load these static assets instantly from the device cache, bypassing expensive network round trips entirely. Finally, the backend infrastructure will be configured to apply Brotli compression algorithms to drastically shrink the byte footprint of all outgoing API payloads.

GitHub link : https://github.com/cs0320-f26/frontend-mockup-gladiators95
