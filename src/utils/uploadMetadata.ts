// {
//     "name": "Roaring Kitty",
//     "symbol": "KITTY",
//     "description": "Roaring Kitty | $KITTY\n\nTHERE'S NO BETTER CAT THAN ROARING MFKING KITTY",
//     "image": "",
//     "extensions": {
//     "website": "",
//     "twitter": "https://twitter.com/Roaring___Kitty",
//     "telegram": "https://t.me/roaringkittysolana"
//     }
//     }

const createMetadata = async (name, symbol, description, image, website, twitter, telegram, discord) => {
    const metadata = {
        name,
        symbol,
        description,
        image,
        extensions: {
            website,
            twitter,
            telegram,
            discord
        }
    }
    return metadata;
}