import { expect, it } from 'vitest';
import { youtubeVideoId } from '../src/youtube';

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
