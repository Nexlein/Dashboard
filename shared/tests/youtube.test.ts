import { expect, it } from 'vitest';
import { youtubeChannels, youtubeVideoId } from '../src/youtube';

const id = 'M7lc1UVf-VE';
it.each([
    id,
    ` https://www.youtube.com/watch?v=${id}&list=PLexample `,
    `https://youtu.be/${id}?si=share-token`,
    `https://m.youtube.com/watch?v=${id}`,
    `https://youtube.com/shorts/${id}`,
    `https://www.youtube.com/live/${id}`,
    `https://www.youtube.com/embed/${id}`,
    `https://www.youtube-nocookie.com/embed/${id}`,
])('extracts the video ID from %s', (url) => {
    expect(youtubeVideoId(url)).toBe(id);
});

it('normalizes channel links and deduplicates handles', () => {
    expect(
        youtubeChannels(
            'https://www.youtube.com/@GoogleDevelopers/videos\n@googledevelopers,UC_x5XG1OV2P6uZZ5FSM9Ttw',
        ),
    ).toEqual(['@googledevelopers', 'UC_x5XG1OV2P6uZZ5FSM9Ttw']);
    expect(youtubeChannels('https://youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw')).toEqual([
        'UC_x5XG1OV2P6uZZ5FSM9Ttw',
    ]);
    expect(youtubeChannels('https://www.youtube.com/@%C3%A9ducation')).toEqual(['@éducation']);
});

it.each([
    '',
    null,
    'UCbad',
    'https://evil.example/@channel',
    'https://youtube.com.evil.example/@channel',
    'https://user@youtube.com/@channel',
    'https://youtube.com:444/@channel',
    'https://youtube.com/watch?v=M7lc1UVf-VE',
    '@one,@two,@three,@four,@five,@six',
    'http://127.0.0.1/private',
])('rejects unsafe or invalid channel lists %s', (input) => {
    expect(youtubeChannels(input)).toBeNull();
});

it.each([
    '',
    null,
    123,
    'bad',
    `https://evil.example/watch?v=${id}`,
    `https://youtube.com.evil.example/watch?v=${id}`,
    `https://youtube.com@evil.example/watch?v=${id}`,
    `https://evil.example@youtube.com/watch?v=${id}`,
    `javascript:alert('${id}')`,
    `https://youtu.be/${id}/extra`,
    `https://www.youtube.com/playlist?list=${id}`,
    `https://www.youtube.com/watch?v=<script>`,
    `https://www.youtube.com:444/watch?v=${id}`,
])('rejects invalid or non-YouTube input %s', (url) => {
    expect(youtubeVideoId(url)).toBeNull();
});
