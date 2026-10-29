@extends('layouts.app')

@section('content')
  <section class="grid md:grid-cols-3 gap-4">
    @foreach ($plans as $plan)
      <article @class(['oc-card', 'ring-2 ring-ral3020' => $plan->featured])>
        <h2 class="font-bold">{{ $plan->name }}</h2>
        <p>{{ number_format($plan->price, 2, ',', '.') }} EUR</p>
        @if ($plan->trial)
          <span class="oc-badge">{{ __('Free trial') }}</span>
        @endif
      </article>
    @endforeach
  </section>
@endsection
