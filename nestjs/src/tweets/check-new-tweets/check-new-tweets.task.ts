import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { TweetsService } from '../tweets.service';
import { Cache } from 'cache-manager';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';

@Injectable()
export class CheckNewTweetsTask {
  private limit = 10;

  constructor(
    private tweetService: TweetsService,
    @Inject(CACHE_MANAGER)
    private cache: Cache,
    @InjectQueue('emails')
    private emailsQueue: Queue,
  ) {}

  @Interval(5000)
  async handle(): Promise<void> {
    console.log('Seeking tweets...');
    let offset = await this.cache.get<number>('tweet-offset');
    offset = offset === undefined || offset === null ? 0 : offset;

    console.log(`offset: ${offset}`);

    const tweets = await this.tweetService.findAll({
      offset,
      limit: this.limit,
    });

    console.log(`tweets count: ${tweets.length}`);

    if (tweets.length === this.limit) {
      console.log('found more tweets');

      const ttl = 1 * 60 * 60;
      await this.cache.set('tweet-offset', offset + this.limit, ttl);

      this.emailsQueue.add({});
    }
  }
}
