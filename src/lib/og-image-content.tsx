const AGAPEO_ICON_WHITE_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAANwAAADmCAYAAAC+u+tKAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAfsElEQVR4nO1dCbhdVXV+ee8lgswzIUwGwqQIWrDWSpApCUPCDAGBmjgxFNAOTHEAjBCRGbEf9BPaar+PfgVFTKFUU4hBCEPLUAwIiiJTAJEhKeS917tXv32z1n3/2zn33nP22We6Z/3fdzkhufecfdZe/15rr733Wn19CoVCoVAoFAqFQqFQKBQKhUKhUCgUCoVCoVAoFAqFQqFQKHoBRDQQ49NfdDsVisqCiMYJmRJ+X4mnUMSFJQwRDdoP///7iWgqER1PRN8koruI6EEiWkxEM/nfphPRbs7v+1XqCkV3sjWJwtbqemPM40RkqD3k394iomuJaDISr0+hUES6gxP4zzOMMfcQ0RIhlDHm/+J8+PvLiWiRvQ/fb7y9v8pcoRglnLiPBxDRe0ychkOkbrCWbgS+/w4RXUdEazGh1cVUKNh1tPO0q5kk5BAnKZoWkYhG+P9vFVdVSaeoNay7Z6/GmB8wOYa7zNcSEY+IViHp+JnqXirqB1F8IrqYiFYyQRoUHsN8vU3JpqglwNocAFYtlGWLwiq+ns7P1eilol4wxryPiJ63LEgxX4uLBj/ntxINVSjqFpE803H5MoVhUtv5IhB+gBfJdYeKoqfnbROMMb9D65MH52g14V6SYI07p+NIZqytZApFlazb6UwCCd3nhQZfbyGiv7WL40R0Es8lt3DaatfuNKKpqLx1sy7ccw4B8obh6/8S0RARrbCRUt7hsg+3s2npdO1O0Qvu5KuO4ufLNtOczw3JAjlfpS12ieI13lq2Lriaau0UlXQnTwOlLxoGru4OFWt93yaiz0r7lXSKKu4qOTfP6KQHZAF+BPZnWldzE34PtXSK8gMigzZYUWbCIRrSTmPMQ0S0Eb+Dkk5RblTIwkXBBlYs7uJ30aUDRbkBUb8jWXmz3s4VFDDnlDmdHvdRVCJoYte9ilwS8IUEVSwO4ndRS6co/YblD/L6V1OJqVoY5ut5/C5KOEU5IYEG3sNo0yBUkXAGLLOkcFDSKUpv5b5b0NaukFbuc/wuetRHUfp53F+UaPE7EaDNC/lddIlAUW7wro0XKxo8afB1uTFmfX4fJZ2i3CCiZY4CV9GtPJ3fRd1KRTX2VFZsAZycuef5+E4KRZkDJ3tWeHmgYf9js0IXLU+FIjZKcC4ubeDkNn4PncMp/MAnnSNdpFApCGBN7vuOAlcFhq8vqzupSEOE1v5AqWDjfPpD7COEedwpVVyPM2rhFAFPZK9jty5xsp2X+fOiMeaPRHQ3Ee2NpEn5zLULSCYUAhLoOTWULBQ1AlicY4wxb7ZRfgPu30z8XcpnP1Nhwv1lKDkoagJwE6eAImE2ZPw08384pOtPeVynqAxeIeZwB+K7KBRJNhRbdzGO4su/LwXLmDhKB789oUrrcWZ0/vbvvu+uqCnAuu3lKFNcpTvWd4SHOeO6nIK8Cm6lAes2zffdFTUFuHU3JAzPCzEeSFMGCn77w4TPL4t16w/fK4qeBCj7blB11Hgo3zEprFzTrTTGHFWBeZyBgUbnbgpv6/b3ntalAXO5ZlrwpFZO2mCM2ReUupTbvMyofOZy29W6Kbysm/d+xkBWTtry3849S5e1yxhzp+97KmoMsG43plFy+N3DvnM5aMtfp2lL1nkpabUl39DnHRU1B7iAqa0K/HY/n9EfCHdoieZxBjMvE9EiItpYZJdRtyh6EaDgJ4RQcCDctXh/j+WBzQtcHjD8GXYW/d8iojncPq0toPAinCj4Ew5h0igrsXLu7BNQgEHg/kBtSpJnUqro4N+/yfUEpHqOrZCqlk1RrHUDDRWFvQ6f49Gurzj3yyKsPwzzsladON6sfQERnYHuo0YjFcGsW0DXTTY2243POyW1ckC4qQHbZWAONuTcc4TXHm8jor+JWlfTCqiKVIjYuxg0OAFW6WpXeWO2T6Kc9zn3S9QMJtZQxDLHMB8F+qox5kvWXXR3+cO5P3UfFWFg83BkFJgQK/dGSiv30wSEawU73O8bY96178inyi8xxnwcD9FK+2xFVl1XU2Rl3Y7PMvSexsoB4aY794qCFEyMevZTRLSAkxStZ09CwDPsnGw8f9SKKbIFET0GCpsFxMrZ0+E7ipIndCm3cWuAM5mGI9otkcZbbBkpuzAtAQ8BRxitFdM63Yrqz93WYNyopblSFN6jrU23EhafBUK4R4joCrsMQUQTcS7GVmyCEkzRq3O3NTgHVm6HJHM5iKJad/B1uOcSIvpnIjqRiCa59bbZRWwGO9RVVBQGOP7yacf6ZA2xold5BE+ERJOMMbvyBusNnH8bYJJZN1F37SvKA6ukxphHc94yJVbutz6EcIkE8zB71bmYonwAa7AjEb2DRMiJcI00aRhkl4cSTFEJQJj9moJ24Uv+/Yd0XqWoi3XbgYhWgtXJFTBnnM3t0YObit4DhNeLsm4CcSsf1OCGog7WrQzloIR0x3O71Mopeo5sg3KauwS5HjHZkHdKPYWi7NZtFSt60Vmw5PkriGhbbKdCUWnYxWC+2s27ZUof7i6Ea/ELRe+4kxyKL4M7iZC2HMft1LmcorqA+dGckiZVHXaO7jStsUJRZes2uc1p5zJA2rTSGLM1tluhKAzuqeS4v3HW3coyd2u3++Qe2AkzLm7dcfmkEK+i7uhWxD7O7/k6gavZlC17cTvibRPnHTv9u8/gpKgheNf7mEOTfJ1gjPkyEe0D3+umkANO+oQyBUo6RSwv53YPxng3e5L7LE7+80UeXMZFkE8DMYpROEdOhGRrc6q2F4joFVZGu7v/NZv+m7/TzgLiAcwHKkK4Vi5Ie+bNlUsE2Y5lech72esrfPTH5pH8RIRsB3R+WG+XsakAEEmcaoyZZ9O2GWN+7yjkMFgBGwA5hH8z0EEpjwNlrAI6rss5ZJNo61CbJK5vE9Gvieh8Ivpz/l0/yF2tXo2JNpctmVUSgeS0bwBh5O8sluA93T/zM+6vGOFaEUvYfdIfEQT6IZaLAois3PR4SL4NoB8sAZV4vQh3ZCWijWzyUU7f9g6M8C7JoiD/NiXKbaqodXOtnKzLDUYQ7lbnu91SmOP3XmRXXVxOtXg9TrRN2G18SRSDR+OGxzrZjh2swK0ViUyOAbT3527yH3i3HyU8XoTka/Df2T/fRUSfhPvrHK/KcIi2qZ3MC9FYsUZSWqAxhIPrDrwpWJSNKkq6axyi+RJuzO1p9e/kt9b9vFOIx26mrulVCdxp4zMkmolyKUEhv+MobqUA7V7i7gcNaL0NEE+SG82DCjk2wqvzu7IDAiIDnLf+l9zB0rmNQLsybK7+iW42K06CWlnrBhA5zQK5ukETOWqUCmY0g7PFy0R0NshVSVdGSH56/vMGRHQRdGZcoslcA+uV4WcIXKFp/KwB53o9PLeygPbfB/KVd5zGRTnIWRaQj8g76YAzAnPqhTxgNkmnO1fK60LO5cVpapP3vo1+tYjZ9jv8xXe56H0rDyOu4xWQ+i4P0h3uBjU4GaxYunYyjloi6IYGBLFsG77Gz9b9mmUALKbabUZ/BdHHOBuF3ciZLQb4G06uM5vz/svHbtH6DBF9NKJIoIz8i3vBugngPR5w1xj5ug7KiDNJH24rrvLGgZflVnYwSyiXEbCSd8B8eUJRulZ7iPBtZ/D6DnZUNyDR/sBbsA5GxWqHNtZtZ640KgqWFWSHRy7n6oAkrbmcXNu5eSCTnYwxn+e8KdLWEQ/iEW+vm8P3XWPPpiJjgAu5I1i1OGQT91FK8X7LRjL5XuOijp04n/5OiV0ztm5jlBWCDZkRD573IJKpi5yi9qYezgmUDNw3brvFW7GD6mnSDp3X5QBn8n6GE+6PqzyWmJditRe8b4K25GXdkGh2jricR/xWNDRLorezcnHk41bPIaJZRPRfEe8V1/23mC9rrEq6/CKRCzysmlTonAsK4b27IQ/rJpaAr3bBeXdQ3k8S0Tdko3VWpIP7LpV+8JGVs3/1TLl3QtI1XUx+Zym7pQvlGZPtMu6AVTE6SxZYpZ7ZhtJJaeYBoDhTuOaaPCsY4N1sNHB3kYPbDpbNzc5vQmPEjVgG2P1zBBE96dyf4vYnezey20fX6zIK+9s5F8Wcu6CrdQrcK3XnwCLwsQkVJp5Wjbb775z5klgK2SPaCiAQ0T86v82iPfeLHEOcpieiTYjoCY8UFCMwr5uctk2KaOVGsiVRkpPkPqE6BZTcLiGEPhVgYL62c7dsWlA+yn6ezaA92CZbAXV7lEEKGY6HDeWJK8FC/1rSfUBkkaZNtQa4bduLyxTTkmDI/JTQ6d9gADgiC4sC97uZnzOQoE0nZ9Em556Xxm1XjHYPgKV70qPtMvh+O1SbagtQouvbHHjsphhLcKIesF1i3R7OwppA+y9MkLSoH3aAZLXbRe73GliUcQFJNwXePUnbZRD+Bt9HgygpyLYgCdkcd0w2FwdbJBXlMMYclWGQQhToYA8LZ3fIZJmSbyS0lXNId5bznLgYdjJIK+niwhmtk5Z2ku/NzcLFgL2EWaYtF2U71INwx2Vcew7nckGLgNDoO3zXY9CQfngupPXteWC4nYied4RZqGvhJNHJIwTvY+GOzyHpbCNqj2VAV30iEf2P8yyf9BA6n0ug1HZHfhLFMbAvcsuQihDRtm87HVw3wqGst8nCypnVG6GTDmqYMUzW59TKxVAam1Q0qUK71i0TV5KItiOit5wOrhvhsI0LMpL3gDHmUX6GWrnQcBKwLksoaPneI0S0Od4vdBszWnerIuFksHkhC7L1rb6elMLKrYAFcbVyHYT8BQ8hi3KdjMqXgQLklba8KoQT5T6Vnx10+cUY8z7Ieu2zTCBJkHQu18a6rQM5SOIqtRz3eDWrcktAuMudDq0z4dw5U+i5XD9fv+48K0m7bIRbt311m7slsW5wtu0XITu84MSuVSEcPuc8bEdgN/6FFHO56+LKsBYIYN0aSdesErZPFPkKpyOzRJUIJ/JfnOFgd22KudxKOCGiczlYSN46qTKDdXs8C4E6bVvpdGSWqBLhUCZHxG1vHMA7fcHjnQyk8gu6QF9pwCg2J4XbcAneK2DbpMOvdp6XNapGOOmze0MGTmh0HvchzwFv2Fm6qHf9cqfSzL0eboMo5szQ8wdo2yTO5pW0s+tEOCRdUCsngIOqSQbk4XaFSWoJUOr1iOhpD4GKYh6ZAeFEga9ynpUHqky4e93+DdQPcz3eC+dxYxJF1d2dPMXptCTCfCuqik2ggWDznOduVSZcZHr0AH0x6OiID+GGoKprrQknJ35vSmpFIGByD9+jP4OB4Bin4/JCVQkn7b4C+zdlXwzirhMPT8PdglbfeRwQ7ntJhQlzvcszsm5beRwNqjvhZBOCTaq0GcozQL8M8tEb33mc7DpRwiVMn+AS7pHAhMOMUkk7t+6EQ3ndgYl1U/bJOL4+HSBwooRLSbgb4ypl3M7lZDw+UdNQqDLh0NptWyLCXcP3UML5EM5HKRNYtyM9OjYkKk24iGRDqaLHpIQrFeGCbOly0nEXXQWn0oRzwvH7h8hj2acWrucINwC574u0br1AOILsyD/A9vlACdeDLmWJrFuvEC5YGgZSC1c84YAQ/xrAZQlh3bBc8UjKj2wlm4HtS5i1670A7Uhay61dH30L25gUSrgeWxaADl3iY90SVoCpnIVL8X5o5bYN0E+/4vtplLJAwqVKYgPWbaZz36TteJtTuy20lokLEM7y/Ni2HJ0kP4uzYH8032NWio9t/8FE9G8wH0tMOvjNZb5WjtSlLBXhlqYZOaEz70uqVPDdRUS0F96vF+DUobub9ySaPK0cjQ6I+0TcMw5Ep67k++g6nGfQRNyKZSnIJp051WMEl+cvsslu5H5Q9TPEx6fwYadyyT6fVnkvmyzIQ074/eko95jvI67yZzxdZd1pEihK2fq+zfOPneOb2DWBIrUKxMNJhZ4dOUHp1/U5lwZyXexh4cZUBUqoI5hZbFpf3XObgDB9clZEVeUc9HCXJhtj3oAOSvLcG3qdbBGDU+JET873D8b7JTj1fYvHc2Uzte3fjXvN5U8MEObkJJ3XoUqoz9zgshQJanZJ+tweOSycNFHvmBJifTFlBvrxCRjkfFIseAdserUT1/XcmCrf/aXncydzrbOkHSnYuS6EczwSW3OcfJM+Ucy5XEQSId8SVnoWzjXv9iCp0ylxIZ0wO04n4nekhHGKNbS6EU7k9hNH9rEAcv55HLmBhfOtXe7Wm+h51z9J4OQ7Pp0IVu6xOD46WLcPpLBu8sw5dZmIg/J/2FNmvlZuAtfwRrnHehTsuMmkmlLVO3InEKhPWmu78DwF79lllL7UUYAkaLaTq7usVYfOBPfutBRyo7gRS3jeZz0HYk0EG2OHhA/hYhfzgGdtn3LuhoozB0binrR0MEjZgMlTaU9TmFHZtQ3Vw0CcasmIiOa3e0Yt4ZSp8sk9iN9/OOF+w7Sp7xpM2BNh4XtcqI+vPHmxOlQ7pPzz+qHKLJsuVg7ItidnTm7+LMkj4PvBDij34jwuTYbjhjNB7u+QttxnE2y7jm3wlqfz7I4VfFaPlRB7C05DpIYZJd0h+CxnYLzZ033FeoE6f4voWBnRdvdcb8HvvxA1L3DnbgETuxq410pb54A3Maf5PMb1zfdxlTGGp7CljQKy6/dE2rbY9zHGvNt80YAnIsyaEctxDtlOTdFPMsU4n++l0ckOhEicMi8imDGvnaIS0bP43YCkGw5I4tIdz8noBHzDObUvns5uEJk0Ke57Ylz51Q6homAg7JPkvm1S32WRaxIPoab5WBfVl3ByAHUoUFuykhUOLF+3bYdN4P/Ef+8zgElbX69LBNkL4FKs5bnrhJzfPOMeB7FFG1PcN0+UysJlCNP8jzGv2ig1BEpGUpBc+vYc7HtFPms9T8AoV3TquySoC+HwxMc8nn+GcCU7RqsVjpXjYupprBzWHji3YtatboRrwhjzpjHmdyH63LrVKBNFgg2rASJjNhHOnVAnoAqoHeFo7PzXB62lACWYBzjY8YwjzMSdyITFWuBVQJ0Jl1ZmYt00MpmEbPZqjPm8I8w0nZF3BZw0qCPhQpbJUrL5gLcohdoVUiUo4ZJHOt+05xtFb7wUrs6A3Sd7FFinrSgo4ZLL6puoN4p0pLu5Zm6SEi4GIKAmrqRGJQNZuT1582xTztT7UMJ1h0wxXrbHrdS6hSfdXjVyLZVwnWFg+9thrB9q3QKSTiJwN9bEtVTCdcawU99do5KhARuQ/8ERei9CCdce0u9XsT5okCQL8OnjgZTH7qsCJVw8y+aVDl7hR7qbWPjiy/cSlHDtydaKSCrZcgAQbgoRrShBtdIsoISLjkiqZSsCWMJIEtv0GOmUcGuSTeZsatkKIl0zM1WEe9kLSwZKuDWh27aKBqelG3RIN9wD+y6VcAzwXC7hftb1toJJ18ydyIdWj+Tj+lVfNlDCjUI8Fpu4d6L0eaFKV3cw6STj08eMMX+s+LKBEi7ayknOUbVyZQCQbjKs1a2qoIuphOuebEgXvAsKnKyRJhv2X94AaRaqFMVUwjmA/ruG+1bdyiKA+e/h71rF7Y0xnzbGvFSxk99KuM6k21sG10KUrq4gos0hd/xABBElgvkRzgiFyU3LDCVcZ8JdFNXniuyIJi7jA9wBH+X/H++6GrxQ2g/FQpqJhUruYirhoiHeySu2KIsMrEq0fHaZTIeOsIdT/wwINtBhXvdBqA1X1iimEq4N1MrlDCDOEu4DLKJxMxAsqpDHIJDuxRLP65Rw3SOWdl6uEcucrNsMFrq4hQ1Q0oU28RB/b0IUYeE+V5Q0iqmE6wDoq2YREJ3LZW/dFjuCb/4vKOqKLi7mAJDucrhXWYIpSrgOgH5fooTLjmyyUXmSnTSzwKMIIlu6/sBFQca3q4gKJYL34GQ0ZTl1oITrDun7/ZR02RBOLNJFMYiBLubtRPQhKHzvRjGbpOO9mAv4NyMFWzslXBdA//8sakBVhLNuTUsUI9CBmZ1sKeB9Yemgk4t5SQlI10uEyzIo1eDr/nHlpPCwbgnD+U3F4w3Nc4lobSSxG0zhz58Q0XMezwqFqhOu4cyJMyGcUSuX29wtaQc2QAFvI6Kdo0jHfydzvh25sH0RZ+wqS7iI4NPdnPe/+c8UHvKsaXFlpYihSHZPZEqLY3eYvMt/vgXv3UF5N7I56wuIYlaOcCwfafdyIjqfiHbnNp3pvFcwqJXLxrptYQvtsYwbATpnfifCRazXnZfzwdYqEa4VoGL5LjbG7OoEpNYnot/A90OiAQvhm6LeKJITTpTocwGUSHYovAEnhztGtph04mJuT0S/hnaYuhNOil3ydZEN0UuuGVn/hHad5bxbSMg9L4grL0VnZbKdSYEqZF6KChoHoDSbQxQzy1MHZSdcw1nvPMcJPPVH1G1fHwasRkZtspgRV2aK6F0lNrIoMAGtWyK3Q87XsfKcy4EAGd3rRDgJ89vtcL8gou3k+e3aCa752c77hW6X7ZB5KA9FAvBidNx1t66dkTbzE7tKzf2ZRDTTBmGYcMM1IJyBez4Ga1+tbNid5MbXDTO0cgYCNhvhcxXdlUdGxMMCdA6WpN0sREeAcm9FRE/zc4YCKlGpCCcRSL4uBS+hddYwQZ+eDfcMCrjn3SH6uTaAEfFnATpnJG5k0tPl3dJmBQ48rysN4ZzDumfJs5LKUeRljPl4hvM4sXKvq5WL3zEyEh7qCDFNB7wHqRiCjXrOwdZDiOjJQHOUMhDOdSGnwzt7yRD69vbmAzKc/xpjvoZyUXS3bnen7RT47U/d+4cCBlOsy0pEywIsHRRNOAwG2fXPTeK2Iybh/jRrK8cBsg35eepadumQQwJ1iCj8oSEUposyyXrdFsaYx3GdqmKEw3OFp8m9Q8mORvv4xyCj0JD2fwVlo2jfKf8RoDOErIs4kpb5KOcsHXwJOt9UhHDtyBbs6AuNEu5jTj+FhM7lEriSm9rjNI7g0gh9FnZ01nBcTNxdYUpOOHQjT2uXBS0w6e7I0MoNO7tPmh6IwlEYO9lNG3iADvzPvKxbu1oHxpgve5Aub8Ih2U7PWkEph4glvM9C6ZOs3qfK1m0jnuw2ZZZC3tKBM4vc5gPzurMTKlaehMNoZOZkazeXy3iPpc7l2iiLzwHTTlGqdYoe3cDS4ZyuLISLmrPl4nrRmlbOZGjlfozPrDVw7hbAuhn47ZyyCBm2g0lxEUn9UArCGWO+T0Tvz3twolEr9yPnvUMB9WG/suhDoQBFuTiA0OVs1D195RxUJsI63UjBhGsUYdkKtHI/wWfWEs4B09cDCF2U7Myyrb/AjpSJsiOlQ3QuU8LBc5fK/Ytyu2nUyt2WYcRSphn71pp0oCTzAwjbQLKgSWWMTIFytUjXJpCSJeEaUI9hmxLMcQf5el4AHYgE3POO2hLOcbNeCzh3O6PMQoXI5ewOrmUehDurDHIiiFAT0Qsp9aAT5J6fKsN7V926iRI9W0bL5kLWBono4TbvnhXhRE5nx71vD1q5hbUjnJP6brnIJIU8R5yi66VQpHaAtANbw3m6RsaEazj5+Ms0vx0HB1RfzMHKTa0V6UA5MAVdWiG+Vta5W5edNUflRDi552Fx75knaLT95wTQiWhF4XsaY+6sDeEgWrdVisSunQ6YlkqRYgZRLnBIF5pwcr+L496vQCu3Xk5zuQ/XgnSgZPs5SuYnvdGRsJQjdwJFWxZRiCQE4US+T0MBw3ElDyjNd94hGEBfvlpFfUlj4VKnT4DfPlFmRYopD6wKFJJwcq8D496rBLKYit1MYSEDkLWiW1RVb5IK9CCHMGl98serLDjYcWHTzuHWr1SEA/leiN8pK2hsDsu3pZvT6EgXvZlX9kEolMtwF754gNFqWV9vDESTOfhjAhBuCFKAT6rCfIVG3euNiegd4QeFh9zz+Sxy3ZRNqbZjJUDCpIG4TCdWYRSPIZ/74N3SEM4mTkLrVvpRnMYuD2Rm4dpYud45oOrsI3wu8KHDhjOPK/UoHkPZdoHktzNSEM7wfQrfvuWhJ9OQG5QN0MpNrMqgFDflgBxPuTCL6BO4pldV3MoNOFG6aSkIV5mNABGECzXliDtYPwOuZSVkFQnM9sT1wrI62WugtPCuVSUdyEqidAfh38ck3HEQhauSdRvP1wOdPs0UQOpfAenWqAVfJaLZ7VvXOS+Xiez4utypTzZYUdfyKUseD8Idw3K4Hf++rKDVfSRkO4CLZuJm9DwwApauVcosdMayVBBlhk+zTJFTqugw2CuYR4FASTW+ioiu4DaMA+ENln3kArdqvj2YiX8Xk3DHsiyk2EY5FIZBo7XjmsoMA/P+HOgxOZd3dklns0yfbEtOc7tEr119H6PrRQv0cGPMQ0CAPMvfyjMNJ2SdjaN8aQTVAT6ZxsAyrk1E3yOinfj/S/OuMvj1jW3vHkT0L0y2LGvudYWz6cCeVzyBiKZge933yUVofP0IER1t8z7y6HStNcnGmEeh0XkXo2/JDtpgeNSazfUKCk8sFAdpT2GX7f1AbzbjfviijSzzgWHfhLlZwOrrECwb/J7d+ytZzw9nz20p1lvIY5e7TTzT6QBlYSMVAPclEnfo07181B5cttIQDtzGvd3jN1CdpwxkQ4hnFqXH0ta37RGrTHUJ5go38UNXsDuwinc3DLGSl+kzxG20bbW4Bd9FkRvhZjg6M8RKPVLizzC3cxW3GT8EAbr+Ii1cKQFR0gX4LorcCDe9ajrTAWLldsmacDjZncWj1sEV+hxSlXlcj9aNmFVBnWn3sXPRdfEdFdEK0HNzN0WPA9YmKvcpWnZ1BQd0BnrpU7RMFQqFQqFQKBQKhUKhUCgUCoVCoVAoFAqFQqFQKBR9PYz/B3mph7/EZNTdAAAAAElFTkSuQmCC";

/** Contenu partagé par opengraph-image.tsx et twitter-image.tsx (Satori/next-og
 * n'accepte que du flexbox explicite — pas de layout block implicite). */
export function OgImageContent() {
  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        position: "relative",
        background: "linear-gradient(135deg, #FF6FA0 0%, #E83E75 55%, #C22F5E 100%)",
        padding: "90px"
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -90,
          right: -70,
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.12)",
          display: "flex"
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -140,
          right: 140,
          width: 280,
          height: 280,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.08)",
          display: "flex"
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", maxWidth: 820 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <img
            src={`data:image/png;base64,${AGAPEO_ICON_WHITE_BASE64}`}
            width={100}
            height={105}
            alt=""
            style={{ display: "flex" }}
          />
          <div
            style={{
              display: "flex",
              fontSize: 90,
              fontWeight: 800,
              color: "#FFFFFF",
              letterSpacing: "-0.03em"
            }}
          >
            AGAPEO
          </div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 32,
            fontWeight: 500,
            color: "rgba(255,255,255,0.94)",
            marginTop: 22,
            lineHeight: 1.4
          }}
        >
          Rencontres chrétiennes pensées pour le mariage
        </div>
      </div>
    </div>
  );
}
