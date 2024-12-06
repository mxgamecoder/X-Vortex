import moment from 'moment-timezone';
import config from '../config.js';
import { bot } from '../lib/plugins.js';
import { getFloor,utils } from '../lib/utils.js';
import { getBuffer, getJson } from 'utils';
const base_url = 'https://api.giftedtech.my.id/api/';
const { API_KEY } = config;

bot(
	{
		pattern: 'lyrics',
		isPublic: true,
		desc: 'Search Lyrics',
		type: 'search',
	},
	async (message, match) => {
		const req = match || message.reply_message?.text;
		if (!req) return message.send('_Give me song Name_');
		const res = await getJson(`https://itzpire.com/search/lyrics?query=${req}`);
		const { title, album, thumb, lyrics } = res.data;
		const image = await getBuffer(thumb);
		return await message.send(image, { caption: `*${title}*\n\`\`\`${album}\n\n${lyrics}\`\`\`` });
	},
);

bot(
	{
		pattern: 'stickersearch',
		isPublic: true,
		desc: 'Search and Download Stickers',
		type: 'search',
	},
	async (message, match) => {
		if (!match) return message.send('```Give me a search query```');
		const req = await getJson(`${base_url}search/stickersearch?apikey=${API_KEY}&query=${match}`);
		for (const stickerUrl of req.results.sticker) {
			const buff = await getBuffer(stickerUrl);
			await message.send(buff, { type: 'sticker' });
		}
	},
);

bot(
	{
		pattern: 'google',
		isPublic: true,
		desc: 'Search and Get Google Results',
		type: 'search',
	},
	async (message, match) => {
		if (!match) return message.send('```Give me a search query```');
		const req = await getJson(`https://api.giftedtech.my.id/api/search/google?apikey=${API_KEY}&query=${match}`);

		if (!req.results || req.results.length === 0) return message.send('```No results found for your query.```');

		let resultsMessage = '';
		req.results.forEach(result => {
			resultsMessage += `\n\n*Title:* ${result.title}\n*Description:* ${result.description}\n*URL:* ${result.url}\n\n`;
		});

		await message.send(`\`\`\`*Google Search*\n\n${resultsMessage}\`\`\``);
	},
);

bot(
	{
		pattern: 'imdb',
		isPublic: true,
		desc: 'Sends info of a movie or series.',
		type: 'search',
	},
	async (message, match) => {
		if (!match) return message.send('_Name a Series or movie._');
		const data = await getJson(`http://www.omdbapi.com/?apikey=742b2d09&t=${encodeURIComponent(match)}&plot=full`);

		let imdbInfo = [`*Title:* ${data.Title}`, `*Year:* ${data.Year}`, `*Rated:* ${data.Rated}`, `*Released:* ${data.Released}`, `*Runtime:* ${data.Runtime}`, `*Genre:* ${data.Genre}`, `*Director:* ${data.Director}`, `*Writer:* ${data.Writer}`, `*Actors:* ${data.Actors}`, `*Plot:* ${data.Plot}`, `*Language:* ${data.Language}`, `*Country:* ${data.Country}`, `*Awards:* ${data.Awards}`, `*BoxOffice:* ${data.BoxOffice}`, `*Production:* ${data.Production}`, `*IMDb Rating:* ${data.imdbRating}`, `*IMDb Votes:* ${data.imdbVotes}`].join('\n\n');

		const buff = await getBuffer(data.Poster);
		await message.send(buff, { caption: imdbInfo });
	},
);

bot(
	{
		pattern: 'weather ?(.*)',
		isPublic: true,
		desc: 'weather info',
		type: 'search',
	},
	async (message, match) => {
		if (!match) return await message.send('*Example : weather delhi*');
		const data = await getJson(`http://api.openweathermap.org/data/2.5/weather?q=${match}&units=metric&appid=060a6bcfa19809c2cd4d97a212b19273&language=en`).catch(() => {});
		if (!data) return await message.send(`_${match} not found_`);
		const { name, timezone, sys, main, weather, visibility, wind } = data;
		const degree = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'][getFloor(wind.deg / 22.5 + 0.5) % 16];
		return await message.send(`*Name :* ${name}\n*Country :* ${sys.country}\n*Weather :* ${weather[0].description}\n*Temp :* ${getFloor(main.temp)}°\n*Feels Like :* ${getFloor(main.feels_like)}°\n*Humidity :* ${main.humidity}%\n*Visibility  :* ${visibility}m\n*Wind* : ${wind.speed}m/s ${degree}\n*Sunrise :* ${moment.utc(sys.sunrise, 'X').add(timezone, 'seconds').format('hh:mm a')}\n*Sunset :* ${moment.utc(sys.sunset, 'X').add(timezone, 'seconds').format('hh:mm a')}`);
	},
);
