# timetrack-pro-199350-199363

---

Chronose Frontend is a lightweight, modern React time tracker.

## Development & Preview

- To start the frontend on **0.0.0.0:3000** (required for remote preview systems), this project uses [Create React App](https://create-react-app.dev/).
- The actual port and bind address can be controlled by the environment variables:  
  - `HOST` (default: 0.0.0.0)  
  - `PORT` (default: 3000)  
  - `REACT_APP_PORT` is only used for runtime reference from the React app code, not by the dev server itself.

**Basic commands:**

```sh
cd chronose_frontend
npm install
npm start
```

## Structure

- `chronose_frontend/src/` - App code.
- `chronose_frontend/public/` - Static assets and `index.html`. (Required for React app to start.)

## Environment variables

| Variable              | Purpose                                         |
|-----------------------|-------------------------------------------------|
| HOST                  | Address to bind dev server (default 0.0.0.0)    |
| PORT                  | Port for dev server (default 3000)              |
| REACT_APP_PORT        | Used _inside_ React code for dynamic references |
| REACT_APP_API_BASE    | (examples for API integration)                  |
| ...                   | ...                                             |

**Note:**  
If changing the dev server port/address for preview, always update the relevant env vars!

---


**Note added by Kavia Agent:**  
The folder `chronose_frontend` was missing the minimum required React app structure and could not start.  
A minimal `package.json`, `src/`, and `public/` layout were created to allow the React app to start and listen on port 3000, so health and preview checks succeed.  
You may now develop your lightweight time tracking frontend as planned.