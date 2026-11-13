# Prohance Malaysia - EDS POC
Home page POC on AEM Edge Delivery Services with Document Authoring (da.live/#/akaspanion/aem-eds-poc). The previous Universal Editor POC is preserved at tag `ue-poc`.

## Environments
- Preview: https://main--aem-eds-poc--akaspanion.aem.page/
- Live: https://main--aem-eds-poc--akaspanion.aem.live/

## Documentation

Before using the aem-boilerplate, we recommend you to go through the documentation on https://www.aem.live/docs/ and more specifically:
1. [Developer Tutorial](https://www.aem.live/developer/tutorial)
2. [The Anatomy of a Project](https://www.aem.live/developer/anatomy-of-a-project)
3. [Web Performance](https://www.aem.live/developer/keeping-it-100)
4. [Markup, Sections, Blocks, and Auto Blocking](https://www.aem.live/developer/markup-sections-blocks)

## Installation

```sh
npm i
```

## Linting

```sh
npm run lint
```

## Local development

1. Create a new repository based on the `aem-boilerplate` template
1. Add the [AEM Code Sync GitHub App](https://github.com/apps/aem-code-sync) to the repository
1. Install the [AEM CLI](https://github.com/adobe/helix-cli): `npm install -g @adobe/aem-cli`
1. Start AEM Proxy: `aem up` (opens your browser at `http://localhost:3000`)
1. Open the `cm-p62213-s44386-prohance-malaysia-website-poc` directory in your favorite IDE and start coding :)
