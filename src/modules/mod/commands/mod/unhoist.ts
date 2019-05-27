import { Message } from 'eris';

import { IMClient } from '../../../../client';
import { Command, Context } from '../../../../framework/commands/Command';
import { CommandGroup, ModerationCommand } from '../../../../types';
import {
	NAME_DEHOIST_PREFIX,
	NAME_HOIST_REGEX
} from '../../services/Moderation';

export default class extends Command {
	public constructor(client: IMClient) {
		super(client, {
			name: ModerationCommand.unhoist,
			aliases: ['dehoist'],
			args: [],
			group: CommandGroup.Moderation,
			strict: true,
			guildOnly: true
		});
	}

	public async action(
		message: Message,
		args: [],
		flags: {},
		{ guild, t, settings }: Context
	): Promise<any> {
		let lastId: string = undefined;
		const batches = Math.ceil(guild.memberCount / 1000);

		const embed = this.createEmbed({
			title: t('cmd.unhoist.title'),
			description: t('cmd.unhoist.starting')
		});

		const msg = await this.sendReply(message, embed);
		if (!msg) {
			return;
		}

		let changed = 0;
		let ignored = 0;
		let errored = 0;
		for (let i = 0; i < batches; i++) {
			embed.description = t('cmd.unhoist.processing', {
				current: i + 1,
				total: batches
			});
			await msg.edit({ embed });

			const members = await guild.getRESTMembers(1000, lastId);
			lastId = members[members.length - 1].id;

			for (const member of members) {
				// Ignore missing members?
				if (!member) {
					continue;
				}

				// Ignore bots
				if (member.bot) {
					ignored++;
					continue;
				}

				// If moderated roles are set then only moderate those roles
				if (
					settings.autoModModeratedRoles &&
					settings.autoModModeratedRoles.length > 0
				) {
					if (
						!settings.autoModModeratedRoles.some(
							r => member.roles.indexOf(r) >= 0
						)
					) {
						ignored++;
						continue;
					}
				}

				// Don't moderate ignored roles
				if (
					settings.autoModIgnoredRoles &&
					settings.autoModIgnoredRoles.some(ir => member.roles.indexOf(ir) >= 0)
				) {
					ignored++;
					continue;
				}

				const name = member.nick ? member.nick : member.username;

				if (!NAME_HOIST_REGEX.test(name)) {
					continue;
				}

				const newName = NAME_DEHOIST_PREFIX + ' ' + name;
				await guild
					.editMember(member.user.id, { nick: newName }, 'Unhoist command')
					.then(() => changed++)
					.catch(() => errored++);
			}
		}

		embed.description = t('cmd.unhoist.done', { changed, ignored, errored });
		await msg.edit({ embed });
	}
}
