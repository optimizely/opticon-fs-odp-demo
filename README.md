# opticon-fs-odp-demo

## Demo Links

- [Mosey Fashion (Foundation Store)](https://opticon2022.opti-us.com/)
- [Optimizely Full Stack Project](https://app.optimizely.com/v2/projects/22139720746)
- [Optimizely Web Project]()


## Instructions

Build with

```sh
npm run build
```

Deploy by committing the contents of `/dist` to the `main` branch of this repository and pushing to Github. Github will use a webhook to tell the [Mosey Fashion](https://opticon2022.opti-us.com/) backend to download the contents of this repository and serve them statically.

You can trigger a "deploy" manually with

```sh
./bin/deploy.sh
```