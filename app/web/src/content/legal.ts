import { env } from '@/lib/env'

import type { LegalBlock, LegalDocument } from './types'

const liveLabBlocks: readonly LegalBlock[] = [
  { kind: 'h3', text: 'When You Use the Live Lab' },
  {
    kind: 'p',
    text: 'The lab’s builder runs in your browser. Step names and answers stay in your browser’s memory and are gone when you close the tab.',
  },
  {
    kind: 'p',
    text: 'If you choose Race this step or Argue the other side, the examples or step description you type are sent to Amazon Bedrock, an AWS service, to run that one test. AWS processes it in its US regions (N. Virginia, Ohio or Oregon). We do not store the text, and we have turned off Bedrock’s request logging.',
  },
  {
    kind: 'p',
    text: 'Our server keeps a count of how many live runs happened each day, with no link to you, for 7 days. The lab shows you how many runs are left today.',
  },
  {
    kind: 'p',
    text: 'Our server writes a short technical log for each run: the time, whether it succeeded, how long it took and how many tokens it used. It never includes what you typed. These logs are deleted after 3 days.',
  },
]

const quietLabBlocks: readonly LegalBlock[] = [
  { kind: 'h3', text: 'When You Use the Lab' },
  {
    kind: 'p',
    text: 'The lab’s builder runs in your browser. Step names and answers stay in your browser’s memory and are gone when you close the tab.',
  },
  {
    kind: 'p',
    text: 'The lab’s live tests, Race this step and Argue the other side, are not switched on. Nothing you type in the lab is sent to Amazon Bedrock or any other AI service.',
  },
]

export const privacy: LegalDocument = {
  title: 'Privacy Policy',
  description: 'How we handle information you send us.',
  updated: 'TODO(owner): date of publication',
  sections: [
    {
      heading: 'Who We Are',
      blocks: [
        {
          kind: 'p',
          text: 'McCor Labs LLC is a software development firm based in Minnesota, United States. This policy explains what happens to information you give us through this website.',
        },
        {
          kind: 'p',
          text: 'If you have a question about any of it, email marcm@mccorlabs.com.',
        },
        {
          kind: 'p',
          text: 'Postal address: TODO(owner): a real PO box for McCor Labs LLC, to replace the placeholder address before publishing.',
        },
      ],
    },
    {
      heading: 'The Short Version',
      blocks: [
        {
          kind: 'p',
          text: env.labLive
            ? 'We collect what you send us through the contact form. If you use the live part of our lab, the text you type for that test is sent to Amazon Bedrock to run it and is not stored by us. We do not use cookies. We do not use analytics. We do not track you across websites, and we do not sell or share your information with anyone for advertising.'
            : 'We collect what you send us through the contact form. The live part of our lab is not switched on, so nothing you type in the lab is sent to an AI service. We do not use cookies. We do not use analytics. We do not track you across websites, and we do not sell or share your information with anyone for advertising.',
        },
        {
          kind: 'p',
          text: 'The detail below explains this more precisely, because you should not have to take our word for it.',
        },
      ],
    },
    {
      heading: 'What We Collect, and When',
      blocks: [
        { kind: 'h3', text: 'When You Use the Contact Form' },
        { kind: 'p', text: 'The form asks for:' },
        {
          kind: 'ul',
          items: [
            'Your name — required',
            'Your email address — required, so we can reply',
            'Your phone number — required (US or Canada)',
            'Your company — optional',
            'Your budget range — optional',
            'Your message — required',
          ],
        },
        {
          kind: 'p',
          text: 'We use this only to respond to your enquiry and, if it leads somewhere, to carry on that conversation. We do not add you to a mailing list. We do not have a mailing list.',
        },
        {
          kind: 'p',
          text: 'When you press Send, the form goes over HTTPS to a small program we run on Amazon Web Services. It checks the form, adds one to a count of today’s messages, and emails your message to us. It does not save your message anywhere else.',
        },
        {
          kind: 'p',
          text: 'The daily count is a number next to today’s date and holds nothing about you. It is deleted automatically after 7 days.',
        },
        {
          kind: 'p',
          text: 'The program keeps a technical log for 3 days: the time, what happened (sent, rejected and why, or the type of error), a reference number, and today’s message count. It never logs your name, email address, phone number, company, budget or message.',
        },
        {
          kind: 'p',
          text: 'If the form is sent within 3 seconds of the page opening, we ask you to send it again. People rarely type that fast; scripts do.',
        },
        {
          kind: 'p',
          text: 'The form includes a hidden field that automated bots fill in and people do not. If it is filled in, we discard the submission. It collects nothing about you.',
        },
        { kind: 'h3', text: 'When You Email Us Directly' },
        {
          kind: 'p',
          text: 'We receive whatever you send, including your email address and anything in your signature or attachments. Same use: replying to you.',
        },
        ...(env.labLive ? liveLabBlocks : quietLabBlocks),
        { kind: 'h3', text: 'When You Mark a Verdict as Wrong' },
        {
          kind: 'p',
          text: 'If you press "Wrong?" on a verdict in our lab and send it, we store four things: which of the six verdicts it was, which rule in our rubric gave that verdict, the version of our rubric, and which of three fixed reasons you picked. We store nothing you typed, nothing about your steps, and nothing that identifies you or your device. We also keep a count of how many marks arrive each day, so we can stop accepting them after 500 in a day.',
        },
        {
          kind: 'p',
          text: 'Once a week, an automated email tells us how many marks each rule and verdict received for each reason. We use these counts to improve the rubric.',
        },
        { kind: 'h3', text: 'When You Simply Read the Site' },
        {
          kind: 'p',
          text: 'Nothing is collected in your browser. Specifically:',
        },
        {
          kind: 'ul',
          items: [
            'No cookies are set. Not for analytics, not for advertising, not for functionality',
            'No analytics service is used. We do not know how many people visit this site or which pages they read',
            'No advertising or tracking pixels',
            'No embedded third-party scripts. Fonts are served from our own domain rather than a font CDN, so no third party sees your request for them',
            'No social media widgets or share buttons that phone home',
          ],
        },
        {
          kind: 'p',
          text: 'If you have turned on a "do not track" or "global privacy control" signal, there is nothing here for it to switch off.',
        },
        {
          kind: 'p',
          text: 'The site does store a small amount of information in your own browser to remember your preferences. This never leaves your device, is never sent to us, and you can clear it at any time through your browser settings.',
        },
        { kind: 'h3', text: 'Server Logs' },
        {
          kind: 'p',
          text: env.labLive
            ? 'We do not keep server access logs for this website. The contact form’s 3-day technical log and the live lab’s short technical log are described above.'
            : 'We do not keep server access logs for this website. The contact form’s 3-day technical log is described above.',
        },
      ],
    },
    {
      heading: 'Who Else Sees Your Information',
      blocks: [
        { kind: 'p', text: 'We keep this list short on purpose.' },
        {
          kind: 'ul',
          items: [
            env.labLive
              ? 'Amazon Web Services gets contact form submissions in transit and at rest, the email itself, and the text of any live lab test you run. They host this site, run the email delivery and run the lab’s AI model. Contact data is processed in the US East (N. Virginia) region; live lab tests may be processed in N. Virginia, Ohio or Oregon'
              : 'Amazon Web Services gets contact form submissions in transit and at rest, and the email itself. They host this site and run the email delivery. Contact data is processed in the US East (N. Virginia) region',
            'Google (Calendar appointment scheduling) gets whatever you enter when you book a call, typically your name, email address and any note you add. This happens only if you click through to book, and Google’s own privacy policy applies from that point',
          ],
        },
        {
          kind: 'p',
          text: 'That is the complete list. We do not use a CRM, an email marketing platform, an analytics provider, an advertising network, or a chat widget.',
        },
        {
          kind: 'p',
          text: 'We have never sold personal information and will not. We do not "share" it for cross-context behavioral advertising, in the sense those terms are used in US state privacy laws.',
        },
        {
          kind: 'p',
          text: 'Booking a call is a deliberate handoff. The booking button is an ordinary link to a third-party scheduling service. We do not embed their code in this site, so they see nothing about you until you choose to click it. Once you are on their page, you are subject to their privacy policy, not this one.',
        },
      ],
    },
    {
      heading: 'How Long We Keep It',
      blocks: [
        {
          kind: 'p',
          text: 'Contact form submissions and email correspondence are kept for 24 months from our last exchange, then deleted. If your enquiry becomes a project, the correspondence is kept as a business record for as long as we are required to keep it.',
        },
        {
          kind: 'p',
          text: env.labLive
            ? 'Live lab text: not kept. Daily run counts: 7 days. Technical logs: 3 days.'
            : 'Daily message counts: 7 days. Technical logs: 3 days.',
        },
        {
          kind: 'p',
          text: 'Verdict marks are deleted automatically after 90 days. Daily counts are deleted after 7 days.',
        },
        {
          kind: 'p',
          text: 'Ask us to delete your information sooner and we will, unless we are legally required to keep it.',
        },
      ],
    },
    {
      heading: 'How It Is Protected',
      blocks: [
        {
          kind: 'ul',
          items: [
            'All traffic to this site is encrypted in transit (HTTPS)',
            'Contact form submissions are encrypted in transit',
            'Our email is stored on encrypted storage, and access requires multi-factor authentication',
            'Only the people who need to see an enquiry can see it. This is a four-person firm, so that is a short list',
          ],
        },
        {
          kind: 'p',
          text: 'No system is perfectly secure, and we are not going to claim otherwise. What we can say is that we do not collect what we do not need, which is the most effective protection available.',
        },
      ],
    },
    {
      heading: 'Your Rights',
      blocks: [
        { kind: 'p', text: 'Wherever you are, you can ask us to:' },
        {
          kind: 'ul',
          items: [
            'Tell you what we hold about you',
            'Correct it if it is wrong',
            'Delete it',
            'Send you a copy in a portable format',
            'Stop using it',
          ],
        },
        {
          kind: 'p',
          text: 'Email marcm@mccorlabs.com and we will respond within 30 days. We will not charge you and we will not make it difficult.',
        },
        {
          kind: 'p',
          text: 'If you are in the European Economic Area or the United Kingdom, you also have the right to object to processing and to complain to your national data protection authority. Our lawful basis for handling your enquiry is legitimate interest: you contacted us and we are replying.',
        },
        {
          kind: 'p',
          text: 'If you are a California resident, you have the rights described above under the CCPA as amended. We do not sell or share personal information, so there is no opt-out to exercise. We will not discriminate against you for making a request.',
        },
        {
          kind: 'p',
          text: 'If you are a Minnesota resident, the Minnesota Consumer Data Privacy Act gives you comparable rights. We will honor them regardless of whether the Act’s size thresholds apply to a firm of this size.',
        },
      ],
    },
    {
      heading: 'Children',
      blocks: [
        {
          kind: 'p',
          text: 'This website is aimed at businesses and is not directed at children. We do not knowingly collect information from anyone under 16. If you believe a child has sent us information, email us and we will delete it.',
        },
      ],
    },
    {
      heading: 'International Visitors',
      blocks: [
        {
          kind: 'p',
          text: 'We operate in the United States and your information is processed there. If you are contacting us from outside the US, you are sending it to the US by doing so.',
        },
      ],
    },
    {
      heading: 'Changes to This Policy',
      blocks: [
        {
          kind: 'p',
          text: 'If we change what we collect, adding analytics for instance, or a new tool that handles your information, we will update this page and change the date at the top. Material changes will be flagged on the page rather than made quietly.',
        },
      ],
    },
    {
      heading: 'Complaints',
      blocks: [
        {
          kind: 'p',
          text: 'Email marcm@mccorlabs.com first. We would rather sort it out directly. If you are in the EEA or UK and we do not resolve it, you can complain to your national data protection authority. If you are in the US, your state attorney general’s office handles privacy complaints.',
        },
      ],
    },
  ],
}

export const terms: LegalDocument = {
  title: 'Terms',
  description: 'The terms that apply to this site.',
  updated: 'TODO(owner): date of publication',
  sections: [
    {
      heading: 'About These Terms',
      blocks: [
        {
          kind: 'p',
          text: 'These terms apply to your use of this website, operated by McCor Labs LLC, a Minnesota limited liability company. TODO(owner): attorney review of the whole of this page before publishing. No terms source copy was supplied, so this text is a minimal draft.',
        },
      ],
    },
    {
      heading: 'Using This Site',
      blocks: [
        {
          kind: 'p',
          text: 'You may read this site and contact us through it. Please do not attempt to disrupt it, probe it for weaknesses, or submit content that is unlawful or that you are not entitled to send.',
        },
      ],
    },
    {
      heading: 'Information on This Site',
      blocks: [
        {
          kind: 'p',
          text: 'The site describes what we do and how we work. It is general information, not an offer or a quotation. Any engagement is governed by a written agreement between you and McCor Labs LLC, and nothing on this site forms part of that agreement unless it says so.',
        },
      ],
    },
    {
      heading: 'Ownership',
      blocks: [
        {
          kind: 'p',
          text: 'The text, design and code of this site belong to McCor Labs LLC unless stated otherwise. You may link to it freely.',
        },
      ],
    },
    {
      heading: 'Your Information',
      blocks: [
        {
          kind: 'p',
          text: 'What we do with information you send us is described in the privacy policy.',
        },
      ],
    },
    {
      heading: 'Liability',
      blocks: [
        {
          kind: 'p',
          text: 'TODO(owner): limitation of liability and warranty disclaimer wording, to be supplied by counsel.',
        },
      ],
    },
    {
      heading: 'Governing Law',
      blocks: [
        {
          kind: 'p',
          text: 'TODO(owner): confirm governing law and venue. The privacy policy states Minnesota, United States.',
        },
      ],
    },
    {
      heading: 'Contact',
      blocks: [
        {
          kind: 'p',
          text: 'Questions about these terms: marcm@mccorlabs.com.',
        },
      ],
    },
  ],
}
