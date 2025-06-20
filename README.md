# Romnexity

This is a very basic clone of Perplexity AI's search app. 

It was created with assistance from Claude 4.0 chat and Continue.dev with Mistral AI and Claude 3.5 Sonnet API keys. It uses Tavily's search API and and OpenAI's GPT-4o API.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

You'll need to get a Tavily API key and an OpenAI API key to run this project.

You can get a Tavily API key by signing up at [Tavily](https://tavily.com/).

Add a file called `.env.local` to the root of the project with the following content:

```shell
OPENAI_API_KEY=YOUR_API_KEY
TAVILY_API_KEY=YOUR_API_KEY
```

You'll need Node and npm installed locally: Find them here: [Install npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm/)

Install dependencies with: 

```shell
npm install
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


